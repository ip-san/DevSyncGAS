import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  getIncidentLabels,
  setIncidentLabels,
  resetIncidentLabels,
  getIncidentLabelsForRepository,
} from '../../src/config/metrics';
import { addProject, getProjects } from '../../src/config/projects';
import {
  setupTestContainer,
  teardownTestContainer,
  setupDefaultConfig,
  type TestContainer,
} from '../helpers/setup';

describe('Incident Labels Configuration', () => {
  let testContainer: TestContainer;

  beforeEach(() => {
    testContainer = setupTestContainer();
    // プロジェクト追加のために基本的な設定を先に行う
    setupDefaultConfig(testContainer.storageClient);
    resetIncidentLabels();
  });

  afterEach(() => {
    teardownTestContainer();
  });

  describe('getIncidentLabels', () => {
    it('デフォルトで["incident"]を返す', () => {
      const labels = getIncidentLabels();
      expect(labels).toEqual(['incident']);
    });

    it('設定されたラベルを返す', () => {
      setIncidentLabels(['bug', 'p0', 'critical']);
      const labels = getIncidentLabels();
      expect(labels).toEqual(['bug', 'p0', 'critical']);
    });

    it('空配列が設定された場合はデフォルト値を返す', () => {
      setIncidentLabels([]);
      const labels = getIncidentLabels();
      expect(labels).toEqual(['incident']);
    });
  });

  describe('setIncidentLabels', () => {
    it('ラベルを設定できる', () => {
      setIncidentLabels(['bug', 'hotfix']);
      expect(getIncidentLabels()).toEqual(['bug', 'hotfix']);
    });

    it('空配列を設定できる（デフォルト値が使われる）', () => {
      setIncidentLabels(['custom']);
      setIncidentLabels([]);
      expect(getIncidentLabels()).toEqual(['incident']);
    });
  });

  describe('resetIncidentLabels', () => {
    it('設定をリセットしてデフォルトに戻す', () => {
      setIncidentLabels(['custom', 'labels']);
      resetIncidentLabels();
      expect(getIncidentLabels()).toEqual(['incident']);
    });

    it('未設定の状態でリセットしてもエラーにならない', () => {
      resetIncidentLabels();
      expect(getIncidentLabels()).toEqual(['incident']);
    });
  });

  describe('getIncidentLabelsForRepository', () => {
    it('プロジェクトに設定されたインシデントラベルを返す', () => {
      addProject({
        name: 'Test Project',
        spreadsheetId: '1234567890abcdefghijklmnopqrstuvwxyzABCDEF',
        sheetName: 'Test Sheet',
        repositories: [
          { owner: 'test-owner', name: 'test-repo', fullName: 'test-owner/test-repo' },
        ],
        incidentLabels: ['bug', 'critical', 'p0'],
      });

      const labels = getIncidentLabelsForRepository('test-owner', 'test-repo');
      expect(labels).toEqual(['bug', 'critical', 'p0']);
    });

    it('プロジェクトにインシデントラベル設定がない場合はデフォルトを返す', () => {
      addProject({
        name: 'Test Project',
        spreadsheetId: '1234567890abcdefghijklmnopqrstuvwxyzABCDEF',
        sheetName: 'Test Sheet',
        repositories: [
          { owner: 'test-owner', name: 'test-repo', fullName: 'test-owner/test-repo' },
        ],
      });

      const labels = getIncidentLabelsForRepository('test-owner', 'test-repo');
      expect(labels).toEqual(['incident']);
    });

    it('プロジェクトが見つからない場合はデフォルトを返す', () => {
      const labels = getIncidentLabelsForRepository('unknown-owner', 'unknown-repo');
      expect(labels).toEqual(['incident']);
    });

    it('プロジェクトに空配列が設定されている場合はデフォルトを返す', () => {
      addProject({
        name: 'Test Project',
        spreadsheetId: '1234567890abcdefghijklmnopqrstuvwxyzABCDEF',
        sheetName: 'Test Sheet',
        repositories: [
          { owner: 'test-owner', name: 'test-repo', fullName: 'test-owner/test-repo' },
        ],
        incidentLabels: [],
      });

      const labels = getIncidentLabelsForRepository('test-owner', 'test-repo');
      expect(labels).toEqual(['incident']);
    });

    it('複数プロジェクトでそれぞれのインシデントラベルを正しく取得できる', () => {
      addProject({
        name: 'Project A',
        spreadsheetId: '1234567890abcdefghijklmnopqrstuvwxyzABCDEF',
        sheetName: 'Sheet A',
        repositories: [{ owner: 'owner-a', name: 'repo-a', fullName: 'owner-a/repo-a' }],
        incidentLabels: ['bug', 'critical'],
      });

      // 最初のプロジェクトのラベルが取得できることを確認
      const labelsA1 = getIncidentLabelsForRepository('owner-a', 'repo-a');
      expect(labelsA1).toEqual(['bug', 'critical']);

      // プロジェクト数を確認
      let projects = getProjects();
      expect(projects).toHaveLength(1);

      addProject({
        name: 'Project B',
        spreadsheetId: 'abcdefghijklmnopqrstuvwxyz1234567890ABCDEF',
        sheetName: 'Sheet B',
        repositories: [{ owner: 'owner-b', name: 'repo-b', fullName: 'owner-b/repo-b' }],
        incidentLabels: ['incident', 'urgent'],
      });

      // プロジェクト数を確認（2つになっているはず）
      projects = getProjects();
      expect(projects).toHaveLength(2);

      // ストレージの内容を確認
      const projectsJson = testContainer.storageClient.getProperty('PROJECT_GROUPS');
      const savedProjects = JSON.parse(projectsJson || '[]');
      expect(savedProjects).toHaveLength(2);
      expect(savedProjects[0].incidentLabels).toEqual(['bug', 'critical']);
      expect(savedProjects[1].incidentLabels).toEqual(['incident', 'urgent']);

      // 2つ目のプロジェクトを追加後、両方取得できることを確認
      expect(getIncidentLabelsForRepository('owner-a', 'repo-a')).toEqual(['bug', 'critical']);
      expect(getIncidentLabelsForRepository('owner-b', 'repo-b')).toEqual(['incident', 'urgent']);
    });
  });
});
