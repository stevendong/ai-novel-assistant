const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const { fetchSystemConfigs, upsertSystemConfig } = require('../utils/systemConfig');

const router = express.Router();

const CONFIG_KEYS = {
  INVITE_CODE_REQUIRED: 'invite_code_required',
  INVITE_CODE_EXEMPT_START: 'invite_code_exempt_start',
  INVITE_CODE_EXEMPT_END: 'invite_code_exempt_end'
};

router.get('/invite-settings', requireAdmin, async (req, res) => {
  try {
    const configs = await fetchSystemConfigs(Object.values(CONFIG_KEYS));

    const settings = {
      inviteCodeRequired: true,
      exemptStart: null,
      exemptEnd: null
    };

    configs.forEach(config => {
      switch (config.key) {
        case CONFIG_KEYS.INVITE_CODE_REQUIRED:
          settings.inviteCodeRequired = config.value !== 'false';
          break;
        case CONFIG_KEYS.INVITE_CODE_EXEMPT_START:
          settings.exemptStart = config.value;
          break;
        case CONFIG_KEYS.INVITE_CODE_EXEMPT_END:
          settings.exemptEnd = config.value;
          break;
      }
    });

    res.json({ settings });

  } catch (error) {
    logger.error('Get invite settings error:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Settings Error',
      message: 'Failed to get invite settings',
    });
  }
});

router.put('/invite-settings', requireAdmin, async (req, res) => {
  try {
    const { inviteCodeRequired, exemptStart, exemptEnd } = req.body;

    const updates = [
      {
        key: CONFIG_KEYS.INVITE_CODE_REQUIRED,
        value: inviteCodeRequired ? 'true' : 'false'
      },
      {
        key: CONFIG_KEYS.INVITE_CODE_EXEMPT_START,
        value: exemptStart || null
      },
      {
        key: CONFIG_KEYS.INVITE_CODE_EXEMPT_END,
        value: exemptEnd || null
      }
    ];

    await Promise.all(updates.map(({ key, value }) => upsertSystemConfig(key, value)));

    logger.info('Invite settings updated:', {
      userId: req.user.id,
      username: req.user.username,
      settings: { inviteCodeRequired, exemptStart, exemptEnd }
    });

    res.json({
      message: 'Invite settings updated successfully',
      settings: {
        inviteCodeRequired,
        exemptStart,
        exemptEnd
      }
    });

  } catch (error) {
    logger.error('Update invite settings error:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to update invite settings',
    });
  }
});

module.exports = router;
