import { describe, expect, it } from 'vitest';
import { RESOURCES } from '../../sol/config';
import { EXPLAINERS, explainerSpeech } from './explainers';

describe('resource explainers', () => {
  it('explain every resource and both body parts', () => {
    for (const key of [...RESOURCES, 'muscleBone', 'rest'] as const) {
      const e = EXPLAINERS[key];
      expect(e, key).toBeDefined();
      expect(e.askNola, key).toMatch(/\?$/);
    }
  });

  it('use short sentences that read aloud well, with no symbols a voice would stumble on', () => {
    for (const [key, e] of Object.entries(EXPLAINERS)) {
      const speech = explainerSpeech(e);
      for (const sentence of speech.split(/(?<=[.!?])\s+/)) expect(sentence.split(/\s+/).length, `${key}: ${sentence}`).toBeLessThanOrEqual(26);
      expect(speech, key).not.toMatch(/[%→×≈<>]/);
    }
  });
});
