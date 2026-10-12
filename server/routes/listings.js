const express = require("express");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

const pool = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

function ensureCloudinaryConfigured() {
  const requiredVariables = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  const missing = requiredVariables.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing Cloudinary environment variables: ${missing.join(", ")}`,
    );
  }
}

async function uploadImageToCloudinary(file) {
  ensureCloudinaryConfigured();

  const dataUri =
    `data:${file.mimetype};base64,` + file.buffer.toString("base64");

  return cloudinary.uploader.upload(dataUri, {
    folder: "unilink/listings",
    resource_type: "image",
  });
}

async function deleteCloudinaryImages(images) {
  const results = await Promise.allSettled(
    images.map((image) =>
      cloudinary.uploader.destroy(image.public_id, {
        resource_type: "image",
      }),
    ),
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Cloudinary cleanup failed:", result.reason);
    }
  });
}

router.get("/", async (req, res) => {
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
      `,
    );

    res.json({
      status: "ok",
      listings: result.rows,
    });
  } catch (error) {
    console.error("Get listings error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to get listings",
    });
  }
});

router.get("/mine", requireAuth, async (req, res) => {
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
      [req.userId],
    );

    res.json({
      status: "ok",
      listings: result.rows,
    });
  } catch (error) {
    console.error("Get my listings error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to get your listings",
    });
  }
});

router.post(
  "/:listingId/images",
  requireAuth,
  upload.single("image"),
  async (req, res) => {
    let cloudinaryImage;

    try {
      const { listingId } = req.params;

      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "Image is required",
        });
      }

      const listingResult = await pool.query(
        `
          SELECT id, seller_id
          FROM listings
          WHERE id = $1
        `,
        [listingId],
      );

      if (listingResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Listing not found",
        });
      }

      const listing = listingResult.rows[0];

      if (listing.seller_id !== req.userId) {
        return res.status(403).json({
          status: "error",
          message: "You can only upload images to your own listings",
        });
      }

      cloudinaryImage = await uploadImageToCloudinary(req.file);

      const imageResult = await pool.query(
        `
          INSERT INTO listing_images (
            listing_id,
            image_url
          )
          VALUES ($1, $2)
          RETURNING *
        `,
        [listingId, cloudinaryImage.secure_url],
      );

      res.status(201).json({
        status: "ok",
        message: "Image uploaded successfully",
        image: imageResult.rows[0],
      });
    } catch (error) {
      if (cloudinaryImage) {
        await deleteCloudinaryImages([cloudinaryImage]);
      }

      console.error("Upload listing image error:", error);

      res.status(500).json({
        status: "error",
        message: "Failed to upload image",
      });
    }
  },
);

router.post("/create", requireAuth, async (req, res) => {
  try {
    const {
      universityId,
      title,
      description,
      price,
      category,
      condition,
      pickupLocation,
    } = req.body;

    if (
      !universityId ||
      !title ||
      !description ||
      price === undefined ||
      !category ||
      !condition ||
      !pickupLocation
    ) {
      return res.status(400).json({
        status: "error",
        message: "All listing fields are required",
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
        req.userId,
        universityId,
        title,
        description,
        price,
        category,
        condition,
        pickupLocation,
      ],
    );

    res.status(201).json({
      status: "ok",
      message: "Listing created successfully",
      listing: result.rows[0],
    });
  } catch (error) {
    console.error("Create listing error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to create listing",
    });
  }
});

router.post("/", requireAuth, upload.array("images", 5), async (req, res) => {
  let client;
  const uploadedImages = [];
  let transactionStarted = false;

  try {
    client = await pool.connect();

    const {
      universityId,
      title,
      description,
      price,
      category,
      condition,
      pickupLocation,
    } = req.body;

    if (
      !universityId ||
      !title ||
      !description ||
      price === undefined ||
      !category ||
      !condition ||
      !pickupLocation
    ) {
      return res.status(400).json({
        status: "error",
        message: "All listing fields are required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "At least one image is required",
      });
    }

    for (const file of req.files) {
      const image = await uploadImageToCloudinary(file);
      uploadedImages.push(image);
    }

    await client.query("BEGIN");
    transactionStarted = true;

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
        req.userId,
        universityId,
        title,
        description,
        price,
        category,
        condition,
        pickupLocation,
      ],
    );

    const listing = listingResult.rows[0];

    for (const image of uploadedImages) {
      await client.query(
        `
          INSERT INTO listing_images (
            listing_id,
            image_url
          )
          VALUES ($1, $2)
        `,
        [listing.id, image.secure_url],
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    res.status(201).json({
      status: "ok",
      message: "Listing created successfully",
      listing,
    });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Listing transaction rollback failed:", rollbackError);
      }
    }

    if (uploadedImages.length > 0) {
      await deleteCloudinaryImages(uploadedImages);
    }

    console.error("Create listing error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to create listing",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      status: "error",
      message: error.message,
    });
  }

  if (error) {
    console.error("Upload error:", error);

    return res.status(400).json({
      status: "error",
      message: error.message || "Image upload failed",
    });
  }

  next();
});

module.exports = router;
