'use strict';

// @ts-check

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  describeDragTarget,
  describeFileInput,
  formatFileDescriptor,
  summarizeFiles,
  summarizeClipboardKinds,
  rememberUploadIngress,
  recentUploadIngressSummary,
} = require('../electron/preload/upload-diagnostics');

class TestHTMLInputElement {
  constructor() {
    this.tagName = 'INPUT';
    this.id = 'upload';
    this.className = 'primary upload extra ignored';
    this.type = 'file';
    this.accept = 'image/*';
    this.multiple = true;
    this.webkitdirectory = false;
  }
}

test('describes drag targets', () => {
  assert.equal(
    describeDragTarget({ tagName: 'DIV', id: 'dropzone', className: 'one two three four' }),
    'div#dropzone.one.two.three'
  );
  assert.equal(describeDragTarget(null), 'unknown');
});

test('describes file inputs', () => {
  const previous = globalThis.HTMLInputElement;
  globalThis.HTMLInputElement = /** @type {typeof HTMLInputElement} */ (TestHTMLInputElement);
  try {
    assert.deepEqual(describeFileInput(/** @type {HTMLInputElement} */ (/** @type {unknown} */ (new TestHTMLInputElement()))), {
      accept: 'image/*',
      multiple: 'true',
      webkitdirectory: 'false',
      target: 'input#upload.primary.upload.extra',
    });
    assert.equal(describeFileInput(/** @type {EventTarget} */ (/** @type {unknown} */ ({}))), null);
  } finally {
    globalThis.HTMLInputElement = previous;
  }
});

test('formats and summarizes files', () => {
  assert.equal(formatFileDescriptor({ name: 'image.png', type: 'image/png', size: 42 }), 'image.png:image/png:42');
  assert.equal(formatFileDescriptor({}), 'blob:unknown:0');
  assert.equal(
    summarizeFiles([
      { name: 'a.png', type: 'image/png', size: 1 },
      { name: 'b.jpg', type: 'image/jpeg', size: 2 },
    ]),
    'a.png:image/png:1,b.jpg:image/jpeg:2'
  );
  assert.equal(summarizeFiles([]), 'none');
});

test('summarizes clipboard kinds', () => {
  assert.equal(
    summarizeClipboardKinds({
      files: [{ name: 'image.png' }],
      items: [
        { kind: 'file', type: 'image/png' },
        { kind: 'string', type: 'text/html' },
        { kind: 'string', type: 'text/plain' },
      ],
      types: ['text/uri-list'],
    }),
    'files,image,html,text,url'
  );
  assert.equal(summarizeClipboardKinds({}), 'none');
});

test('remembers and summarizes recent upload ingress', () => {
  const scope = /** @type {typeof globalThis & { __canvaUploadIngressCounter?: number, __canvaLastUploadIngress?: unknown }} */ (globalThis);
  const previousCounter = scope.__canvaUploadIngressCounter;
  const previousIngress = scope.__canvaLastUploadIngress;
  delete scope.__canvaUploadIngressCounter;
  delete scope.__canvaLastUploadIngress;
  try {
    const ingress = rememberUploadIngress('drop', {
      files: 2,
      types: 'Files,text/plain',
      target: 'div#dropzone',
    });
    assert.equal(ingress.id, 1);
    assert.equal(ingress.source, 'drop');
    assert.match(recentUploadIngressSummary(), /^id=1 source=drop ageMs=\d+ files=2 types=Files,text\/plain div#dropzone$/);
  } finally {
    if (previousCounter === undefined) delete scope.__canvaUploadIngressCounter;
    else scope.__canvaUploadIngressCounter = previousCounter;

    if (previousIngress === undefined) delete scope.__canvaLastUploadIngress;
    else scope.__canvaLastUploadIngress = previousIngress;
  }
});
