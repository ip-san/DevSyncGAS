/**
 * Slack通知機能のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { initializeContainer, resetContainer } from '../../src/container';
import { createMockContainer, MockSlackClient } from '../mocks';
import { configureSlackWebhook, removeSlackWebhook } from '../../src/functions/slackConfig';
import { isSlackNotificationEnabled } from '../../src/services/slack/client';
import { createDailySummaryMessage } from '../../src/services/slack/dailySummary';
import { CONFIG_KEYS } from '../../src/config/propertyKeys';
import type { DevOpsMetrics } from '../../src/types';
import { ValidationError } from '../../src/utils/errors';

describe('Slack Notification', () => {
  let mockContainer: ReturnType<typeof createMockContainer>;

  beforeEach(() => {
    mockContainer = createMockContainer();
    initializeContainer(mockContainer);
  });

  afterEach(() => {
    resetContainer();
  });

  describe('configureSlackWebhook', () => {
    it('should store valid Slack webhook URL', () => {
      const webhookUrl = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX';

      configureSlackWebhook(webhookUrl);

      const stored = mockContainer.storageClient.getProperty(CONFIG_KEYS.SLACK.WEBHOOK_URL);
      expect(stored).toBe(webhookUrl);
    });

    it('should throw error for empty webhook URL', () => {
      expect(() => configureSlackWebhook('')).toThrow(ValidationError);
      expect(() => configureSlackWebhook('   ')).toThrow(ValidationError);
    });

    it('should throw error for invalid webhook URL format', () => {
      expect(() => configureSlackWebhook('https://example.com/webhook')).toThrow(ValidationError);
      expect(() => configureSlackWebhook('http://hooks.slack.com/services/XXX')).toThrow(
        ValidationError
      );
    });
  });

  describe('removeSlackWebhook', () => {
    it('should remove stored webhook URL', () => {
      const webhookUrl = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX';
      mockContainer.storageClient.setProperty(CONFIG_KEYS.SLACK.WEBHOOK_URL, webhookUrl);

      removeSlackWebhook();

      const stored = mockContainer.storageClient.getProperty(CONFIG_KEYS.SLACK.WEBHOOK_URL);
      expect(stored).toBeNull();
    });
  });

  describe('isSlackNotificationEnabled', () => {
    it('should return true when webhook URL is configured', () => {
      const webhookUrl = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX';
      mockContainer.storageClient.setProperty(CONFIG_KEYS.SLACK.WEBHOOK_URL, webhookUrl);

      expect(isSlackNotificationEnabled()).toBe(true);
    });

    it('should return false when webhook URL is not configured', () => {
      expect(isSlackNotificationEnabled()).toBe(false);
    });
  });

  describe('createDailySummaryMessage', () => {
    it('should create message with no data', () => {
      const message = createDailySummaryMessage([], 'https://example.com/spreadsheet');

      expect(message.text).toContain('日次レポート - データなし');
      expect(message.blocks).toBeDefined();
      expect(message.blocks?.length).toBeGreaterThan(0);
    });

    it('should create message with single repository metrics', () => {
      const metrics: DevOpsMetrics[] = [
        {
          repository: 'owner/repo1',
          date: '2024-01-15',
          deploymentFrequency: '2.5',
          leadTimeForChangesHours: 24.5,
          changeFailureRate: 5.0,
          meanTimeToRecoveryHours: 3.2,
          cycleTimeHours: 48.0,
          codingTimeHours: 12.0,
          timeToFirstReviewHours: 4.0,
          reviewDurationHours: 8.0,
          avgLinesOfCode: 150,
          avgAdditionalCommits: 0.8,
          avgForcePushCount: 0.2,
        },
      ];

      const message = createDailySummaryMessage(
        metrics,
        'https://docs.google.com/spreadsheets/d/test-id'
      );

      expect(message.text).toContain('2024-01-15');
      expect(message.blocks).toBeDefined();

      const blocks = message.blocks!;
      expect(blocks.length).toBeGreaterThan(0);

      // Header block
      expect(blocks[0].type).toBe('header');
      expect(blocks[0].text?.text).toContain('2024-01-15');

      // Section block with status
      expect(blocks[1].type).toBe('section');
      expect(blocks[1].text?.text).toContain('総合ステータス');

      // Section block with metrics
      expect(blocks[2].type).toBe('section');
      expect(blocks[2].fields).toBeDefined();
      expect(blocks[2].fields?.length).toBe(4);

      // Context block
      expect(blocks[3].type).toBe('context');
      expect(blocks[3].elements).toBeDefined();

      // Actions block with button
      expect(blocks[4].type).toBe('actions');
      expect(blocks[4].elements).toBeDefined();
    });

    it('should create message with multiple repository metrics', () => {
      const metrics: DevOpsMetrics[] = [
        {
          repository: 'owner/repo1',
          date: '2024-01-15',
          deploymentFrequency: '2.0',
          leadTimeForChangesHours: 20.0,
          changeFailureRate: 4.0,
          meanTimeToRecoveryHours: 2.5,
          cycleTimeHours: 40.0,
          codingTimeHours: 10.0,
          timeToFirstReviewHours: 3.0,
          reviewDurationHours: 7.0,
          avgLinesOfCode: 120,
          avgAdditionalCommits: 0.5,
          avgForcePushCount: 0.1,
        },
        {
          repository: 'owner/repo2',
          date: '2024-01-15',
          deploymentFrequency: '3.0',
          leadTimeForChangesHours: 30.0,
          changeFailureRate: 6.0,
          meanTimeToRecoveryHours: 4.0,
          cycleTimeHours: 50.0,
          codingTimeHours: 15.0,
          timeToFirstReviewHours: 5.0,
          reviewDurationHours: 10.0,
          avgLinesOfCode: 200,
          avgAdditionalCommits: 1.0,
          avgForcePushCount: 0.3,
        },
      ];

      const message = createDailySummaryMessage(
        metrics,
        'https://docs.google.com/spreadsheets/d/test-id'
      );

      expect(message.text).toContain('2024-01-15');

      const contextBlock = message.blocks?.find((b) => b.type === 'context');
      expect(contextBlock).toBeDefined();
      expect(contextBlock?.elements?.[0]).toMatchObject({
        type: 'mrkdwn',
        text: expect.stringContaining('2個'),
      });
    });

    it('should use only latest date metrics when multiple dates exist', () => {
      const metrics: DevOpsMetrics[] = [
        {
          repository: 'owner/repo1',
          date: '2024-01-14',
          deploymentFrequency: '1.0',
          leadTimeForChangesHours: 10.0,
          changeFailureRate: 2.0,
          meanTimeToRecoveryHours: 1.0,
          cycleTimeHours: 20.0,
          codingTimeHours: 5.0,
          timeToFirstReviewHours: 2.0,
          reviewDurationHours: 3.0,
          avgLinesOfCode: 80,
          avgAdditionalCommits: 0.3,
          avgForcePushCount: 0.1,
        },
        {
          repository: 'owner/repo1',
          date: '2024-01-15',
          deploymentFrequency: '2.0',
          leadTimeForChangesHours: 20.0,
          changeFailureRate: 4.0,
          meanTimeToRecoveryHours: 2.0,
          cycleTimeHours: 40.0,
          codingTimeHours: 10.0,
          timeToFirstReviewHours: 4.0,
          reviewDurationHours: 6.0,
          avgLinesOfCode: 150,
          avgAdditionalCommits: 0.5,
          avgForcePushCount: 0.2,
        },
      ];

      const message = createDailySummaryMessage(
        metrics,
        'https://docs.google.com/spreadsheets/d/test-id'
      );

      expect(message.text).toContain('2024-01-15');
      expect(message.text).not.toContain('2024-01-14');
    });

    it('should handle null values in metrics', () => {
      const metrics: DevOpsMetrics[] = [
        {
          repository: 'owner/repo1',
          date: '2024-01-15',
          deploymentFrequency: '2.0',
          leadTimeForChangesHours: null,
          changeFailureRate: null,
          meanTimeToRecoveryHours: null,
          cycleTimeHours: null,
          codingTimeHours: null,
          timeToFirstReviewHours: null,
          reviewDurationHours: null,
          avgLinesOfCode: null,
          avgAdditionalCommits: null,
          avgForcePushCount: null,
        },
      ];

      const message = createDailySummaryMessage(
        metrics,
        'https://docs.google.com/spreadsheets/d/test-id'
      );

      expect(message.text).toContain('2024-01-15');

      const metricsBlock = message.blocks?.find(
        (b) => b.type === 'section' && b.fields !== undefined
      );
      expect(metricsBlock).toBeDefined();

      // Check that N/A is displayed for null values
      const fieldTexts = metricsBlock?.fields?.map((f) => f.text).join(' ') ?? '';
      expect(fieldTexts).toContain('N/A');
    });

    it('should include spreadsheet URL in action button', () => {
      const metrics: DevOpsMetrics[] = [
        {
          repository: 'owner/repo1',
          date: '2024-01-15',
          deploymentFrequency: '2.0',
          leadTimeForChangesHours: 20.0,
          changeFailureRate: 4.0,
          meanTimeToRecoveryHours: 2.0,
          cycleTimeHours: 40.0,
          codingTimeHours: 10.0,
          timeToFirstReviewHours: 4.0,
          reviewDurationHours: 6.0,
          avgLinesOfCode: 150,
          avgAdditionalCommits: 0.5,
          avgForcePushCount: 0.2,
        },
      ];

      const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/test-spreadsheet-id';
      const message = createDailySummaryMessage(metrics, spreadsheetUrl);

      const actionsBlock = message.blocks?.find((b) => b.type === 'actions');
      expect(actionsBlock).toBeDefined();
      expect(actionsBlock?.elements).toBeDefined();

      // Check button has URL (actual structure depends on Slack Block Kit)
      const button = actionsBlock?.elements?.[0] as {
        url?: string;
      };
      expect(button?.url).toBe(spreadsheetUrl);
    });
  });

  describe('MockSlackClient', () => {
    it('should capture sent messages', () => {
      const slackClient = mockContainer.slackClient as MockSlackClient;

      const message1 = { text: 'Test message 1', blocks: [] };
      const message2 = { text: 'Test message 2', blocks: [] };

      slackClient.sendMessage(message1);
      slackClient.sendMessage(message2);

      expect(slackClient.sentMessages.length).toBe(2);
      expect(slackClient.sentMessages[0]).toEqual(message1);
      expect(slackClient.sentMessages[1]).toEqual(message2);
    });

    it('should return last sent message', () => {
      const slackClient = mockContainer.slackClient as MockSlackClient;

      const message1 = { text: 'Test message 1', blocks: [] };
      const message2 = { text: 'Test message 2', blocks: [] };

      slackClient.sendMessage(message1);
      slackClient.sendMessage(message2);

      expect(slackClient.getLastMessage()).toEqual(message2);
    });

    it('should clear sent messages', () => {
      const slackClient = mockContainer.slackClient as MockSlackClient;

      slackClient.sendMessage({ text: 'Test message', blocks: [] });
      expect(slackClient.sentMessages.length).toBe(1);

      slackClient.clear();
      expect(slackClient.sentMessages.length).toBe(0);
    });
  });
});
