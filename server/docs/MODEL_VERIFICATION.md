# Model Version Verification Guide

This guide explains how to verify which AI model versions are being used in different scenarios.

## 1. Configuration Loading Verification

### Check Current Configuration

**API Endpoint**: `GET /api/ai-config/config`

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/ai-config/config
```

**Expected Response**:
```json
{
  "defaultProvider": "openai",
  "defaultModel": "gpt-3.5-turbo",
  "currentProvider": "openai",
  "availableProviders": [
    {
      "name": "openai",
      "type": "openai",
      "models": {
        "chat": "gpt-3.5-turbo",
        "embedding": "text-embedding-ada-002"
      },
      "available": true,
      "isCustom": false
    }
  ],
  "taskConfigs": {
    "consistency": {
      "temperature": 0.3,
      "max_tokens": 1500
    },
    "creative": {
      "temperature": 0.9,
      "max_tokens": 3000
    }
  }
}
```

### Check Available Models for a Provider

**API Endpoint**: `POST /api/ai-config/models/list`

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}' \
  http://localhost:3001/api/ai-config/models/list
```

**Expected Response**:
```json
{
  "provider": "openai",
  "models": [
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "description": "Most capable model, best for complex tasks"
    },
    {
      "id": "gpt-3.5-turbo",
      "name": "GPT-3.5 Turbo",
      "description": "Fast and cost-effective for most tasks"
    }
  ],
  "count": 2,
  "cached": false
}
```

## 2. Scenario-Based Verification

### Scenario 1: No Configuration (Default Models)

**Environment**:
```bash
# .env - No OPENAI_AVAILABLE_MODELS set
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
```

**Verification**:
```bash
# Should return all 8 default OpenAI models
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}' \
  http://localhost:3001/api/ai-config/models/list | jq '.count'
# Expected output: 8
```

**Expected Models**: gpt-4, gpt-4-turbo, gpt-4-turbo-preview, gpt-4-32k, gpt-3.5-turbo, gpt-3.5-turbo-16k, gpt-3.5-turbo-instruct, text-davinci-003

### Scenario 2: Comma-Separated Configuration

**Environment**:
```bash
OPENAI_AVAILABLE_MODELS=gpt-4,gpt-3.5-turbo
```

**Verification**:
```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}' \
  http://localhost:3001/api/ai-config/models/list | jq '.models[].id'
# Expected output:
# "gpt-4"
# "gpt-3.5-turbo"
```

### Scenario 3: JSON Configuration with Metadata

**Environment**:
```bash
OPENAI_AVAILABLE_MODELS='[{"id":"gpt-4","name":"GPT-4 Pro","description":"For premium users only"}]'
```

**Verification**:
```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}' \
  http://localhost:3001/api/ai-config/models/list | jq '.models[0]'
# Expected output:
# {
#   "id": "gpt-4",
#   "name": "GPT-4 Pro",
#   "description": "For premium users only"
# }
```

### Scenario 4: OpenAI-Compatible API with Model Filtering

**Environment**:
```bash
OPENAI_BASE_URL=https://custom-api.example.com/v1
OPENAI_AVAILABLE_MODELS=gpt-4,custom-model-1
```

**What Happens**:
1. System calls `custom-api.example.com/v1/models` to get available models
2. Filters the API response to only include models in `OPENAI_AVAILABLE_MODELS`
3. Returns filtered list to user

**Verification**:
```bash
# Check server logs to see API call
tail -f server.log | grep "models.list"

# Check returned models
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}' \
  http://localhost:3001/api/ai-config/models/list
```

### Scenario 5: Task-Type Model Recommendation

**API Endpoint**: `POST /api/ai-config/recommend-model`

```bash
# Creative writing task
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"taskType": "creative", "contextSize": 5000}' \
  http://localhost:3001/api/ai-config/recommend-model

# Expected: gpt-4 or claude-3-sonnet (higher creativity)

# Consistency check task
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"taskType": "consistency_check"}' \
  http://localhost:3001/api/ai-config/recommend-model

# Expected: gpt-3.5-turbo or claude-3-haiku (accuracy focused)
```

## 3. Runtime Model Verification

### Add Logging to Trace Model Usage

**Temporary debug logging in `server/services/aiService.js`**:

```javascript
async chat(messages, options = {}) {
  const provider = this.getProvider(options.provider);

  // Add this logging
  console.log('[AI Service] Chat Request:', {
    provider: options.provider || 'default',
    model: provider.models.chat,
    taskType: options.taskType,
    messageCount: messages.length,
    timestamp: new Date().toISOString()
  });

  // ... rest of the method
}
```

**Then monitor logs**:
```bash
# In development
npm run dev

# Watch for model usage
tail -f server.log | grep "\[AI Service\]"
```

### Verify Task-Specific Parameters

**Test creative task**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Write a poem"}],
    "taskType": "creative"
  }' \
  http://localhost:3001/api/ai/chat
```

**Check logs for parameters**:
```
[AI Service] Using task params for 'creative': {
  temperature: 0.9,
  max_tokens: 3000
}
```

### Verify User Preferences Override

**Set user preference**:
```bash
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferredProvider": "claude",
    "preferredModel": "claude-3-opus-20240229"
  }' \
  http://localhost:3001/api/ai-config/preferences
```

**Verify it's used**:
```bash
# Make a chat request without specifying provider
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}]
  }' \
  http://localhost:3001/api/ai/chat

# Check logs
tail -f server.log | grep "claude-3-opus"
```

## 4. Unit Test Verification

### Run Model Configuration Tests

```bash
cd server
npm test tests/config/modelList.test.js

# Should see:
# ✓ returns OpenAI default models
# ✓ returns Claude default models
# ✓ returns Gemini default models
# ✓ returns models for valid provider
# ✓ model IDs are case-sensitive
# ... (20 tests total)
```

### Verify Model Availability Check

```javascript
const { isModelAvailable } = require('./config/aiConfig');

// Test in Node REPL or test file
console.log(isModelAvailable('openai', 'gpt-4')); // true
console.log(isModelAvailable('openai', 'non-existent')); // false
console.log(isModelAvailable('claude', 'claude-3-opus-20240229')); // true
```

## 5. Frontend Integration Verification

### Check Model Selection UI

**Frontend component**: `client/src/components/AIProviderSettings.vue`

1. Open AI settings in the application
2. Select a provider (e.g., "OpenAI")
3. Check dropdown shows only configured models
4. Select a model and save
5. Verify the selection persists

### Verify Model Display

**API call from frontend**:
```javascript
// In browser console
fetch('http://localhost:3001/api/ai-config/models/list', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ provider: 'openai' })
})
.then(r => r.json())
.then(data => console.table(data.models))
```

## 6. Database Verification

### Check User Preferences

```bash
# Using Prisma Studio
npm run db:studio

# Or using SQLite directly
sqlite3 server/prisma/novels.db

# Query user preferences
SELECT userId, preferredProvider, preferredModel, taskPreferences
FROM UserAIPreferences;
```

### Verify Custom Configs

```sql
SELECT userId, customConfigs
FROM UserAIPreferences
WHERE customConfigs IS NOT NULL;
```

## 7. Troubleshooting Verification Issues

### Model Not Showing in List

**Check**:
1. Is the model ID spelled correctly in config?
2. Is the environment variable being loaded?
3. Is the provider available?

```bash
# Verify env var is set
echo $OPENAI_AVAILABLE_MODELS

# Check config loading
node -e "console.log(require('./config/aiConfig').aiConfig.openai.availableModels)"
```

### Wrong Model Being Used

**Check**:
1. User preferences (highest priority)
2. Request-specific provider/model
3. Task type defaults
4. System defaults

```javascript
// Priority order in aiService.js:
// 1. options.model (explicit in request)
// 2. options.provider (explicit provider in request)
// 3. User preferences (from database)
// 4. System default provider
```

### API Models Not Filtering

**Check**:
1. Is the provider type 'openai'?
2. Does the client have models.list method?
3. Are configured model IDs matching API response?

```javascript
// Debug in server/routes/ai-config.js
console.log('Configured IDs:', configuredModels.map(m => m.id));
console.log('API model IDs:', modelList.data.map(m => m.id));
console.log('Filtered models:', models.map(m => m.id));
```

## 8. Verification Checklist

- [ ] Configuration loads from environment variables
- [ ] Default models return when no config set
- [ ] Comma-separated config parses correctly
- [ ] JSON config with metadata works
- [ ] OpenAI API fetch works for compatible providers
- [ ] API results filter by configured models
- [ ] Task-type recommendations work
- [ ] User preferences override system defaults
- [ ] Model availability check works
- [ ] Frontend displays correct models
- [ ] Database stores preferences correctly
- [ ] Logs show actual model usage

## 9. Example Verification Session

```bash
# 1. Start with clean config
unset OPENAI_AVAILABLE_MODELS

# 2. Start server
cd server && npm run dev

# 3. Test default behavior
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}' \
  http://localhost:3001/api/ai-config/models/list | jq '.count'
# Should return 8 (all defaults)

# 4. Set limited config
export OPENAI_AVAILABLE_MODELS="gpt-4,gpt-3.5-turbo"

# 5. Restart server to load new config
# Ctrl+C and npm run dev again

# 6. Test filtered behavior
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}' \
  http://localhost:3001/api/ai-config/models/list | jq '.models[].id'
# Should return only ["gpt-4", "gpt-3.5-turbo"]

# 7. Test task recommendation
curl -X POST -H "Content-Type: application/json" \
  -d '{"taskType": "creative"}' \
  http://localhost:3001/api/ai-config/recommend-model | jq '.recommendedModel'
# Should return "gpt-4" (first in creative preferred models that's available)

# 8. Verify in actual chat
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Test"}],
    "taskType": "creative"
  }' \
  http://localhost:3001/api/ai/chat

# 9. Check logs
grep "temperature.*0.9" server.log
# Should show creative task using temperature 0.9
```

## Summary

Model version verification involves:
1. **Configuration verification** - Ensure env vars are loaded correctly
2. **API endpoint testing** - Test model list and recommendation endpoints
3. **Runtime logging** - Add temporary logs to trace actual usage
4. **Database inspection** - Check stored user preferences
5. **Unit tests** - Run automated test suite
6. **Frontend testing** - Verify UI shows correct options
7. **Integration testing** - Test full request flow with different scenarios

Use the appropriate method based on what you're verifying:
- **Configuration loading**: API endpoints + logs
- **Model filtering**: Unit tests + API responses
- **Runtime usage**: Request logs + response headers
- **User preferences**: Database queries + API tests
