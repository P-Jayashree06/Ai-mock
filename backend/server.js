import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { init } from '@instantdb/admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env explicitly if needed since we are running isolated
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Initialize InstantDB Admin SDK
const db = init({
  appId: process.env.VITE_INSTANTDB_APP_ID || process.env.INSTANTDB_APP_ID,
  adminToken: process.env.INSTANTDB_ADMIN_SECRET
});

app.post('/signup', async (req, res) => {
  try {
    const { email, password, name, instantUserId } = req.body;
    
    if (!email || !password || !instantUserId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Hash the password securely
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Store securely in InstantDB using Admin permissions
    await db.transact([
      db.tx.customUsers[instantUserId].update({
        email,
        name,
        passwordHash,
        createdAt: Date.now()
      })
    ]);

    res.json({ success: true, message: 'User created securely' });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Use admin SDK to securely query customUsers
    const queryResult = await db.query({
      customUsers: {
        $: { where: { email } }
      }
    });

    const users = queryResult.customUsers || [];
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify using bcrypt
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Return sanitized logical session string
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/login-otp', async (req, res) => {
  try {
    const { email, instantUserId, name: providedName } = req.body;

    if (!email || !instantUserId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use admin SDK to securely query customUsers
    const queryResult = await db.query({
      customUsers: {
        $: { where: { email } }
      }
    });

    const users = queryResult.customUsers || [];
    let user;

    if (users.length === 0) {
      // PROMPT: Solve it! -> Auto-create user if they don't exist
      // Use provided name or fall back to email prefix
      const name = providedName || email.split('@')[0];
      await db.transact([
        db.tx.customUsers[instantUserId].update({
          email,
          name,
          createdAt: Date.now()
        })
      ]);
      user = { id: instantUserId, email, name };
    } else {
      user = users[0];
    }
    
    // Return sanitized logical session string
    res.json({
      success: true,
      user: {
        id: user.id || instantUserId,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Login OTP Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword, instantUserId } = req.body;

    if (!email || !newPassword || !instantUserId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Hash the new password SECURELY
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update the customUsers record
    // Note: We purposefully don't overwrite createdAt if it exists
    await db.transact([
      db.tx.customUsers[instantUserId].update({
        passwordHash
      })
    ]);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Node Backend Secure API running on port ${PORT}`);
});
