import assert from 'node:assert/strict';
import { describe, it, before, after, beforeEach } from 'node:test';
import { setupTestServer, callTool, type TestContext } from '../helpers/setup-server.js';

describe('Docs listing tools', () => {
  let ctx: TestContext;

  before(async () => { ctx = await setupTestServer(); });
  after(async () => { await ctx.cleanup(); });
  beforeEach(() => {
    ctx.mocks.drive.tracker.reset();
  });

  // --- listGoogleDocs ---
  describe('listGoogleDocs', () => {
    it('happy path', async () => {
      ctx.mocks.drive.service.files.list._setImpl(async () => ({
        data: {
          files: [{
            id: 'doc-1', name: 'My Document', modifiedTime: '2025-01-01',
            webViewLink: 'https://docs.google.com/doc-1',
            owners: [{ displayName: 'Owner', emailAddress: 'owner@test.com' }],
          }],
        },
      }));
      const res = await callTool(ctx.client, 'listGoogleDocs', {});
      assert.equal(res.isError, false);
      assert.ok(res.content[0].text.includes('My Document'));
    });

    it('no results', async () => {
      ctx.mocks.drive.service.files.list._setImpl(async () => ({ data: { files: [] } }));
      const res = await callTool(ctx.client, 'listGoogleDocs', {});
      assert.equal(res.isError, false);
      assert.ok(res.content[0].text.includes('No Google Docs'));
    });
  });

  // --- getDocumentInfo ---
  describe('getDocumentInfo', () => {
    it('happy path', async () => {
      ctx.mocks.drive.service.files.get._setImpl(async () => ({
        data: {
          id: 'doc-1', name: 'My Document', mimeType: 'application/vnd.google-apps.document',
          createdTime: '2025-01-01', modifiedTime: '2025-01-02',
          webViewLink: 'https://docs.google.com/doc-1', shared: true,
          owners: [{ displayName: 'Owner', emailAddress: 'owner@test.com' }],
        },
      }));
      const res = await callTool(ctx.client, 'getDocumentInfo', { documentId: 'doc-1' });
      assert.equal(res.isError, false);
      assert.ok(res.content[0].text.includes('My Document'));
      assert.ok(res.content[0].text.includes('Google Document'), 'Should show friendly label for native Google Doc');
    });

    it('shows real MIME type for non-native files', async () => {
      ctx.mocks.drive.service.files.get._setImpl(async () => ({
        data: {
          id: 'docx-1', name: 'Report.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          createdTime: '2025-01-01', modifiedTime: '2025-01-02',
          webViewLink: 'https://drive.google.com/docx-1', shared: false,
          owners: [{ displayName: 'Owner', emailAddress: 'owner@test.com' }],
        },
      }));
      const res = await callTool(ctx.client, 'getDocumentInfo', { documentId: 'docx-1' });
      assert.equal(res.isError, false);
      assert.ok(res.content[0].text.includes('Microsoft Word (.docx)'), 'Should show friendly label for .docx');
      assert.ok(!res.content[0].text.includes('**Type:** Google Document'), 'Should not hardcode Google Document');
    });

    it('shows raw MIME type for unknown types', async () => {
      ctx.mocks.drive.service.files.get._setImpl(async () => ({
        data: {
          id: 'file-1', name: 'data.csv', mimeType: 'text/csv',
          createdTime: '2025-01-01', modifiedTime: '2025-01-02',
          webViewLink: 'https://drive.google.com/file-1', shared: false,
          owners: [{ displayName: 'Owner', emailAddress: 'owner@test.com' }],
        },
      }));
      const res = await callTool(ctx.client, 'getDocumentInfo', { documentId: 'file-1' });
      assert.equal(res.isError, false);
      assert.ok(res.content[0].text.includes('text/csv'), 'Should fall back to raw MIME type');
    });

    it('validation error', async () => {
      const res = await callTool(ctx.client, 'getDocumentInfo', {});
      assert.equal(res.isError, true);
    });
  });
});
