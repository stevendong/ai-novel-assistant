const {
  getAvailableModels,
  getDefaultModelList,
  isModelAvailable
} = require('../../config/aiConfig');

describe('Model List Configuration', () => {
  describe('getDefaultModelList', () => {
    test('returns OpenAI default models', () => {
      const models = getDefaultModelList('openai');

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      // Check structure
      models.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('description');
      });

      // Check for common models
      const modelIds = models.map(m => m.id);
      expect(modelIds).toContain('gpt-4');
      expect(modelIds).toContain('gpt-3.5-turbo');
    });

    test('returns Claude default models', () => {
      const models = getDefaultModelList('claude');

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      const modelIds = models.map(m => m.id);
      expect(modelIds).toContain('claude-3-opus-20240229');
      expect(modelIds).toContain('claude-3-sonnet-20240229');
    });

    test('returns Gemini default models', () => {
      const models = getDefaultModelList('gemini');

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      const modelIds = models.map(m => m.id);
      expect(modelIds).toContain('gemini-pro');
      expect(modelIds).toContain('gemini-1.5-pro');
    });

    test('returns empty array for unknown provider', () => {
      const models = getDefaultModelList('unknown-provider');
      expect(models).toEqual([]);
    });
  });

  describe('getAvailableModels', () => {
    test('returns models for valid provider', () => {
      const models = getAvailableModels('openai');

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    test('returns empty array for invalid provider', () => {
      const models = getAvailableModels('invalid-provider');
      expect(models).toEqual([]);
    });

    test('returns default models when no custom config', () => {
      const availableModels = getAvailableModels('openai');
      const defaultModels = getDefaultModelList('openai');

      // Should return default models if no custom configuration
      expect(availableModels.length).toBeGreaterThanOrEqual(defaultModels.length);
    });
  });

  describe('isModelAvailable', () => {
    test('returns true for available OpenAI model', () => {
      expect(isModelAvailable('openai', 'gpt-4')).toBe(true);
      expect(isModelAvailable('openai', 'gpt-3.5-turbo')).toBe(true);
    });

    test('returns false for unavailable model', () => {
      expect(isModelAvailable('openai', 'non-existent-model')).toBe(false);
    });

    test('returns false for invalid provider', () => {
      expect(isModelAvailable('invalid-provider', 'gpt-4')).toBe(false);
    });

    test('returns true for available Claude model', () => {
      expect(isModelAvailable('claude', 'claude-3-opus-20240229')).toBe(true);
    });

    test('returns true for available Gemini model', () => {
      expect(isModelAvailable('gemini', 'gemini-pro')).toBe(true);
    });
  });

  describe('Model list structure validation', () => {
    test('all default models have required fields', () => {
      const providers = ['openai', 'claude', 'gemini'];

      providers.forEach(provider => {
        const models = getDefaultModelList(provider);

        models.forEach(model => {
          expect(model).toHaveProperty('id');
          expect(model).toHaveProperty('name');
          expect(model).toHaveProperty('description');

          expect(typeof model.id).toBe('string');
          expect(typeof model.name).toBe('string');
          expect(typeof model.description).toBe('string');

          expect(model.id.length).toBeGreaterThan(0);
          expect(model.name.length).toBeGreaterThan(0);
        });
      });
    });

    test('model IDs are unique within provider', () => {
      const providers = ['openai', 'claude', 'gemini'];

      providers.forEach(provider => {
        const models = getDefaultModelList(provider);
        const ids = models.map(m => m.id);
        const uniqueIds = new Set(ids);

        expect(ids.length).toBe(uniqueIds.size);
      });
    });
  });

  describe('Environment variable parsing', () => {
    // Note: These tests check the parser logic
    // Actual env var loading is tested in integration tests

    test('parseModelList is called during config load', () => {
      // The function should handle various formats
      const { aiConfig } = require('../../config/aiConfig');

      expect(aiConfig).toHaveProperty('openai');
      expect(aiConfig.openai).toHaveProperty('availableModels');

      // Should be null (no config) or array
      expect(
        aiConfig.openai.availableModels === null ||
        Array.isArray(aiConfig.openai.availableModels)
      ).toBe(true);
    });
  });

  describe('Model filtering behavior', () => {
    test('getAvailableModels returns configured models if set', () => {
      const { aiConfig } = require('../../config/aiConfig');

      // If availableModels is configured, it should be used
      if (aiConfig.openai.availableModels !== null) {
        const models = getAvailableModels('openai');
        expect(models).toEqual(aiConfig.openai.availableModels);
      }
    });

    test('getAvailableModels returns defaults if not configured', () => {
      const { aiConfig } = require('../../config/aiConfig');

      // If availableModels is null, should return defaults
      if (aiConfig.openai.availableModels === null) {
        const models = getAvailableModels('openai');
        const defaults = getDefaultModelList('openai');
        expect(models).toEqual(defaults);
      }
    });
  });

  describe('Case sensitivity', () => {
    test('model IDs are case-sensitive', () => {
      expect(isModelAvailable('openai', 'gpt-4')).toBe(true);
      expect(isModelAvailable('openai', 'GPT-4')).toBe(false);
      expect(isModelAvailable('openai', 'Gpt-4')).toBe(false);
    });
  });

  describe('Model metadata', () => {
    test('all models have meaningful descriptions', () => {
      const models = getDefaultModelList('openai');

      models.forEach(model => {
        expect(model.description.length).toBeGreaterThan(5);
        expect(model.description).not.toBe('');
      });
    });

    test('model names are human-readable', () => {
      const models = getDefaultModelList('claude');

      models.forEach(model => {
        // Name should be more readable than just the ID
        expect(model.name).not.toBe('');
        // Most names should contain spaces or capitals
        expect(
          model.name.includes(' ') ||
          model.name !== model.name.toLowerCase()
        ).toBe(true);
      });
    });
  });
});
