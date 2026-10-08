const express = require('express');
const multer = require('multer');
const path = require('path');

const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          listings.id,
          listings.title,
          listings.description,
          listings.price,
          listings.category,
          listings.condition,
          listings.pickup_location,
          listings.created_at,
          users.name AS seller_name,
          universities.name AS university_name,
          COALESCE(
            JSON_AGG(
              listing_images.image_url
              ORDER BY listing_images.id
            ) FILTER (WHERE listing_images.id IS NOT NULL),
            '[]'
          ) AS images
        FROM listings
        JOIN users
          ON listings.seller_id = users.id
        JOIN universities
          ON listings.university_id = universities.id
        LEFT JOIN listing_images
          ON listings.id = listing_images.listing_id
        GROUP BY
          listings.id,
          users.name,
          universities.name
        ORDER BY listings.created_at DESC
      `
    );

    res.json({
      status: 'ok',
      listings: result.rows,
    });
  } catch (error) {
    console.error('Get listings error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to get listings',
    });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          listings.id,
          listings.title,
          listings.description,
          listings.price,
          listings.category,
          listings.condition,
          listings.pickup_location,
          listings.created_at,
          users.name AS seller_name,
          universities.name AS university_name,
          COALESCE(
            JSON_AGG(
              listing_images.image_url
              ORDER BY listing_images.id
            ) FILTER (WHERE listing_images.id IS NOT NULL),
            '[]'
          ) AS images
        FROM listings
        JOIN users
          ON listings.seller_id = users.id
        JOIN universities
          ON listings.university_id = universities.id
        LEFT JOIN listing_images
          ON listings.id = listing_images.listing_id
        WHERE listings.seller_id = $1
        GROUP BY
          listings.id,
          users.name,
          universities.name
        ORDER BY listings.created_at DESC
      `,
      [req.userId]
    );

    res.json({
      status: 'ok',
      listings: result.rows,
    });
  } catch (error) {
    console.error('Get my listings error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to get your listings',
    });
  }
});

router.post('/:listingId/images', upload.single('image'), async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Image is required',
      });
    }

    const listingResult = await pool.query(
      'SELECT id FROM listings WHERE id = $1',
      [listingId]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Listing not found',
      });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const imageResult = await pool.query(
      `
        INSERT INTO listing_images (
          listing_id,
          image_url
        )
        VALUES ($1, $2)
        RETURNING *
      `,
      [listingId, imageUrl]
    );

    res.status(201).json({
      status: 'ok',
      message: 'Image uploaded successfully',
      image: imageResult.rows[0],
    });
  } catch (error) {
    console.error('Upload listing image error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to upload image',
    });
  }
});

router.post('/create', async (req, res) => {
  try {
    const {
      sellerId,
      universityId,
      title,
      description,
      price,
      category,
      condition,
      pickupLocation,
    } = req.body;

    if (
      !sellerId ||
      !universityId ||
      !title ||
      !description ||
      price === undefined ||
      !category ||
      !condition ||
      !pickupLocation
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'All listing fields are required',
      });
    }

    const result = await pool.query(
      `
        INSERT INTO listings (
          seller_id,
          university_id,
          title,
          description,
          price,
          category,
          condition,
          pickup_location
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        sellerId,
        universityId,
        title,
        description,
        price,
        category,
        condition,
        pickupLocation,
      ]
    );

    res.status(201).json({
      status: 'ok',
      message: 'Listing created successfully',
      listing: result.rows[0],
    });
  } catch (error) {
    console.error('Create listing error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to create listing',
    });
  }
});

router.post('/', upload.array('images', 5), async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      sellerId,
      universityId,
      title,
      description,
      price,
      category,
      condition,
      pickupLocation,
    } = req.body;

    if (
      !sellerId ||
      !universityId ||
      !title ||
      !description ||
      price === undefined ||
      !category ||
      !condition ||
      !pickupLocation
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'All listing fields are required',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one image is required',
      });
    }

    await client.query('BEGIN');

    const listingResult = await client.query(
      `
        INSERT INTO listings (
          seller_id,
          university_id,
          title,
          description,
          price,
          category,
          condition,
          pickup_location
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        sellerId,
        universityId,
        title,
        description,
        price,
        category,
        condition,
        pickupLocation,
      ]
    );

    const listing = listingResult.rows[0];

    for (const file of req.files) {
      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

      await client.query(
        `
          INSERT INTO listing_images (
            listing_id,
            image_url
          )
          VALUES ($1, $2)
        `,
        [listing.id, imageUrl]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      status: 'ok',
      message: 'Listing created successfully',
      listing,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Create listing error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to create listing',
    });
  } finally {
    client.release();
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }

  if (error) {
    console.error('Upload error:', error);

    return res.status(400).json({
      status: 'error',
      message: error.message || 'Image upload failed',
    });
  }

  next();
});

module.exports = router;
