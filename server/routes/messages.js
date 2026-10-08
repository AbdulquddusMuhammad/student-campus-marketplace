const express = require('express');

const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

/*
  Create or find a conversation for a listing.

  The client only sends listingId.
  The backend determines the seller from the listing.
*/
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({
        status: 'error',
        message: 'Listing ID is required',
      });
    }

    const listingResult = await pool.query(
      `
        SELECT
          listings.id,
          listings.title,
          listings.seller_id,
          users.name AS seller_name
        FROM listings
        JOIN users
          ON listings.seller_id = users.id
        WHERE listings.id = $1
      `,
      [listingId],
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Listing not found',
      });
    }

    const listing = listingResult.rows[0];
    const buyerId = req.userId;
    const sellerId = listing.seller_id;

    if (buyerId === sellerId) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot message yourself about your own listing',
      });
    }

    const conversationResult = await pool.query(
      `
        INSERT INTO conversations (
          buyer_id,
          seller_id,
          listing_id
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (buyer_id, seller_id, listing_id)
        DO UPDATE SET buyer_id = conversations.buyer_id
        RETURNING id, buyer_id, seller_id, listing_id, created_at
      `,
      [buyerId, sellerId, listingId],
    );

    const conversation = conversationResult.rows[0];

    res.status(200).json({
      status: 'ok',
      conversation: {
        ...conversation,
        listing_title: listing.title,
        seller_name: listing.seller_name,
      },
    });
  } catch (error) {
    console.error('Create conversation error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to create conversation',
    });
  }
});

/*
  Get all conversations belonging to the logged-in user.
*/
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          conversations.id,
          conversations.buyer_id,
          conversations.seller_id,
          conversations.listing_id,
          conversations.created_at,

          listings.title AS listing_title,

          CASE
            WHEN conversations.buyer_id = $1
              THEN seller.name
            ELSE buyer.name
          END AS other_user_name,

          CASE
            WHEN conversations.buyer_id = $1
              THEN conversations.seller_id
            ELSE conversations.buyer_id
          END AS other_user_id,

          latest_message.message AS last_message,
          latest_message.created_at AS last_message_at

        FROM conversations

        JOIN listings
          ON conversations.listing_id = listings.id

        JOIN users AS buyer
          ON conversations.buyer_id = buyer.id

        JOIN users AS seller
          ON conversations.seller_id = seller.id

        LEFT JOIN LATERAL (
          SELECT
            messages.message,
            messages.created_at
          FROM messages
          WHERE messages.conversation_id = conversations.id
          ORDER BY messages.created_at DESC
          LIMIT 1
        ) AS latest_message
          ON TRUE

        WHERE
          conversations.buyer_id = $1
          OR conversations.seller_id = $1

        ORDER BY
          COALESCE(
            latest_message.created_at,
            conversations.created_at
          ) DESC
      `,
      [req.userId],
    );

    res.json({
      status: 'ok',
      conversations: result.rows,
    });
  } catch (error) {
    console.error('Get conversations error:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to get conversations',
    });
  }
});

/*
  Get one conversation and all of its messages.

  Only the buyer or seller can access the conversation.
*/
router.get(
  '/conversations/:conversationId',
  requireAuth,
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      const conversationResult = await pool.query(
        `
          SELECT
            conversations.id,
            conversations.buyer_id,
            conversations.seller_id,
            conversations.listing_id,
            conversations.created_at,

            listings.title AS listing_title,

            buyer.name AS buyer_name,
            seller.name AS seller_name

          FROM conversations

          JOIN listings
            ON conversations.listing_id = listings.id

          JOIN users AS buyer
            ON conversations.buyer_id = buyer.id

          JOIN users AS seller
            ON conversations.seller_id = seller.id

          WHERE
            conversations.id = $1
            AND (
              conversations.buyer_id = $2
              OR conversations.seller_id = $2
            )
        `,
        [conversationId, req.userId],
      );

      if (conversationResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Conversation not found',
        });
      }

      const conversation = conversationResult.rows[0];

      const messagesResult = await pool.query(
        `
          SELECT
            messages.id,
            messages.conversation_id,
            messages.sender_id,
            users.name AS sender_name,
            messages.message,
            messages.created_at
          FROM messages
          JOIN users
            ON messages.sender_id = users.id
          WHERE messages.conversation_id = $1
          ORDER BY messages.created_at ASC
        `,
        [conversationId],
      );

      res.json({
        status: 'ok',
        conversation,
        messages: messagesResult.rows,
      });
    } catch (error) {
      console.error('Get conversation error:', error);

      res.status(500).json({
        status: 'error',
        message: 'Failed to get conversation',
      });
    }
  },
);

/*
  Send a message inside a conversation.

  Only the buyer or seller can send messages.
*/
router.post(
  '/conversations/:conversationId/messages',
  requireAuth,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Message cannot be empty',
        });
      }

      const conversationResult = await pool.query(
        `
          SELECT id
          FROM conversations
          WHERE
            id = $1
            AND (
              buyer_id = $2
              OR seller_id = $2
            )
        `,
        [conversationId, req.userId],
      );

      if (conversationResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Conversation not found',
        });
      }

      const messageResult = await pool.query(
        `
          INSERT INTO messages (
            conversation_id,
            sender_id,
            message
          )
          VALUES ($1, $2, $3)
          RETURNING id, conversation_id, sender_id, message, created_at
        `,
        [conversationId, req.userId, message.trim()],
      );

      res.status(201).json({
        status: 'ok',
        message: messageResult.rows[0],
      });
    } catch (error) {
      console.error('Send message error:', error);

      res.status(500).json({
        status: 'error',
        message: 'Failed to send message',
      });
    }
  },
);

module.exports = router;
