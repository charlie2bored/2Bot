import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Supabase Service Client (for background tasks)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Twilio Client
const getTwilio = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
};

// Nag Logic: Cron job every minute
cron.schedule('* * * * *', async () => {
  console.log('Running Nag Check...');
  const now = new Date().toISOString();
  
  // Find tasks that are:
  // 1. Pending
  // 2. Start time is in the past
  // 3. Haven't been nagged in the last 5 minutes (or ever)
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'pending')
    .lte('start_time', now);

  if (error) {
    console.error('Error fetching tasks for cron:', error);
    return;
  }

  const twilioClient = getTwilio();
  if (!twilioClient) {
    console.warn('Twilio not configured, skipping nags');
    return;
  }

  for (const task of tasks) {
    const lastNag = task.last_nag_at ? new Date(task.last_nag_at) : new Date(0);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    if (lastNag < fiveMinutesAgo) {
      let message = '';
      switch (task.aggression_level) {
        case 'Drill Sergeant':
          message = `[NUDGE] GET UP! You have "${task.title}" scheduled and you're SLACKING. Check in NOW or I'll keep screaming.`;
          break;
        case 'Firm':
          message = `[NUDGE] Reminder: "${task.title}" started. Please check in to confirm you're on it.`;
          break;
        default:
          message = `[NUDGE] Hi! Just a friendly nudge for "${task.title}". Hope it's going well!`;
      }

      try {
        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: process.env.USER_PHONE_NUMBER || '', // In a real app, this would be task.user_phone
        });

        await supabase
          .from('tasks')
          .update({ last_nag_at: new Date().toISOString() })
          .eq('id', task.id);
          
        console.log(`Nagged for task: ${task.title}`);
      } catch (err) {
        console.error('Failed to send SMS:', err);
      }
    }
  }
});

// API Routes
app.post("/api/tasks/check-in", async (req, res) => {
  const { taskId } = req.body;
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'completed' })
    .eq('id', taskId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
