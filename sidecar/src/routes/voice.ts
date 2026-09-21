import type { FastifyInstance } from 'fastify';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { invokeTool } from '../tools/registry.js';

const VoiceBody = z.object({
  agentId: z.string().min(1),
  audioBase64: z.string().min(1),
});

export async function registerVoiceRoutes(app: FastifyInstance) {
  app.post('/voice/transcribe', async (req, reply) => {
    const parsed = VoiceBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    let decoded: Buffer;
    try {
      decoded = Buffer.from(parsed.data.audioBase64, 'base64');
    } catch {
      return reply.code(400).send({ error: 'audioBase64 is invalid.' });
    }
    if (decoded.length < 45 || decoded.toString('ascii', 0, 4) !== 'RIFF' || decoded.toString('ascii', 8, 12) !== 'WAVE') {
      return reply.code(400).send({ error: 'Expected a WAV recording.' });
    }
    if (decoded.length > 10 * 1024 * 1024) {
      return reply.code(413).send({ error: 'Voice recording is too large.' });
    }

    const dir = await mkdtemp(join(tmpdir(), 'tj-cortex-voice-'));
    const audioPath = join(dir, 'recording.wav');
    try {
      await writeFile(audioPath, decoded);
      return await invokeTool(parsed.data.agentId, 'voice.listen', { audioPath });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}
