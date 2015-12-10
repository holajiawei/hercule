import through2 from 'through2';
import fs from 'fs';
import _ from 'lodash';
import request from 'request';

import RegexStream from '../lib/regex-stream';
import ResolveStream from './resolve-stream';
import TrimStream from './trim-stream';
import {grammar, linkRegExp, LINK_GROUP, WHITESPACE_GROUP} from './config';

/**
* Input stream: object
* - link (object, required)
*   - href (string, required)
*   - hrefType (enum, required)
* - parents (array, required)
* - references (array, required)
*
* Output stream: object
* - chunk (string, required)
*
* Input and output properties can be altered by providing options
*/

const defaultOptions = {
  input: 'link',
  output: 'chunk',
};

module.exports = function InflateStream(options) {
  const opt = _.merge({}, defaultOptions, options);

  function inflateString(chunk, link, cb) {
    this.push(_.assign({}, chunk, {[opt.output]: link.href}));
    return cb();
  }

  function inflateLocalFile(chunk, link, cb) {
    const input = fs.createReadStream(link.href, {encoding: 'utf8'});
    const self = this;
    const extend = {
      relativePath: chunk.relativePath,
      parents: [link.href, ...chunk.parents],
      references: [...chunk.references],
      indent: chunk.indent,
    };

    const tokenizer = new RegexStream(linkRegExp, {
      match: {
        link: (match) => {
          return {
            href: _.get(match, `[${LINK_GROUP}]`),
          };
        },
        indent: (match) => {
          return [chunk.indent, _.get(match, `${WHITESPACE_GROUP}`)].join('');
        },
      },
      leaveBehind: `${WHITESPACE_GROUP}`, // TODO: add failing test for this missing
      extend,
    });
    const resolver = new ResolveStream(grammar);
    const inflater = new InflateStream();
    const trimmer = new TrimStream();

    let content;

    input.on('error', function inputError() {
      // TODO: better error handling: inputError(err)
      // console.log(`Error: ${link.href} could not be be read. (${err.code})`);
      // TODO: append error notice to chunk
      self.push(chunk);
      return cb();
    });

    inflater.on('readable', function inputReadable() {
      while ((content = this.read()) !== null) {
        self.push(content);
      }
    });

    inflater.on('end', function inputEnded() {
      return cb();
    });

    input
    .pipe(trimmer)
    .pipe(tokenizer)
    .pipe(resolver)
    .pipe(inflater);
  }

  function inflateRemoteFile(chunk, link, cb) {
    request(link.href, (err, res, content) => {
      let output;
      if (err || res.statusCode !== 200) {
        // console.log(`Warning: Remote file (${link.href}) could not be retrieved.`);
        // TODO: append error notice to chunk
        this.push(chunk);
        return cb();
      }

      output = content.replace(/\n$/, '');

      this.push(_.assign({}, chunk, {[opt.output]: output}));
      return cb();
    });
  }

  function transform(chunk, encoding, cb) {
    const link = chunk[opt.input];
    const parents = chunk.parents;

    if (!link) {
      this.push(chunk);
      return cb();
    }

    if (_(parents).contains(link.href)) {
      // Circular dependency. Skipping inflate.
      // TODO: append error notice to chunk
      this.push(chunk);
      return cb();
    }

    switch (link.hrefType) {
    case 'file':
      inflateLocalFile.call(this, chunk, link, cb);
      break;
    case 'http':
      inflateRemoteFile.call(this, chunk, link, cb);
      break;
    case 'string':
      inflateString.call(this, chunk, link, cb);
      break;
    default:
      this.push(chunk);
      return cb();
    }
  }

  return through2.obj(transform);
};
