import test from 'ava';

import { transcludeString } from '../../lib/hercule';

test.cb('should transclude with only required arguments', (t) => {
  const input = 'The quick brown fox jumps over the lazy dog.';
  const expected = 'The quick brown fox jumps over the lazy dog.';
  transcludeString(input, (err, output) => {
    t.same(err, null);
    t.same(output, expected);
    t.end();
  });
});

test.cb('should transclude with optional relativePath argument', (t) => {
  const input = 'The quick brown fox jumps over the lazy dog.';
  const expected = 'The quick brown fox jumps over the lazy dog.';
  transcludeString(input, { relativePath: 'test' }, (err, output) => {
    t.same(err, null);
    t.same(output, expected);
    t.end();
  });
});

test.cb('should provide pathList if variable provided', (t) => {
  const input = 'The quick brown fox jumps over the lazy dog.';
  const expected = 'The quick brown fox jumps over the lazy dog.';
  const pathList = [];

  transcludeString(input, null, pathList, (err, output) => {
    t.same(err, null);
    t.same(output, expected);
    t.same(pathList.length, 0);
    t.end();
  });
});

test.cb('should return errors with tokenizer options', (t) => {
  const input = '# Title\n<!-- include(test1.apib) -->\nSome content...\n';
  const options = {
    linkRegExp: new RegExp(/(^[\t ]*)?(?:(\:\[.*?\]\((.*?)\))|(<!-- include\((.*?)\) -->))/gm),
    linkMatch: (match) => match[3] || match[5],
  };

  transcludeString(input, options, (err, output) => {
    t.ok(err.message);
    t.same(output, input);
    t.end();
  });
});