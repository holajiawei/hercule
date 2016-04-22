/**
* Hercule
* A simple markdown transclusion tool
* Author: james ramsay
*/

import fs from 'fs';
import path from 'path';
import dashdash from 'dashdash';
import Transcluder from './transclude-stream';

let opts;
let args;

const parser = dashdash.createParser({
  options: [
    {
      names: ['help', 'h'],
      type: 'bool',
      help: 'Print this help and exit.',
    },
    {
      names: ['output', 'o'],
      type: 'string',
      help: 'File to output.',
      helpArg: 'FILE',
    },
    {
      names: ['relativePath', 'r'],
      type: 'string',
      help: 'Relative path. stdin will be parsed relative to this path.',
    },
    {
      name: 'reporter',
      type: 'string',
      help: 'Supported reporters include json, json-stderr, tree',
    },
  ],
});


try {
  opts = parser.parse(process.argv);
  args = opts._args; // eslint-disable-line
} catch (err) {
  process.stdout.write(`hercule: error: ${err.message}\n`);
  process.exit(1);
}


if (opts.help) {
  process.stdout.write(`usage: hercule [OPTIONS]\noptions:\n${parser.help({ includeEnv: true }).trimRight()}\n`);
  process.exit();
}


function main() {
  let inputStream;
  let outputStream;
  const options = {
    relativePath: '',
    parents: [],
    parentRefs: [],
  };

  if (args.length === 0) {
    // Reading input from stdin
    inputStream = process.stdin;
    options.relativePath = opts.relativePath;
  } else {
    // Reading input from file
    // TODO: handle file error!
    inputStream = fs.createReadStream(args[0], { encoding: 'utf8' });
    options.source = path.normalize(args[0]);
    options.relativePath = path.dirname(args[0]);
  }

  if (opts.output) {
    // Writing output to file
    outputStream = fs.createWriteStream(opts.output, { encoding: 'utf8' });
  } else {
    // Writing output to stdout
    outputStream = process.stdout;
  }

  const transclude = new Transcluder(options);

  transclude.on('error', (err) => {
    if (opts.reporter === 'json-err') {
      process.stderr.write(JSON.stringify(err));
    } else {
      process.stdout.write(`\n\nERROR: ${err.message} (${err.path})\n`);
    }
    process.exit(1);
  });

  inputStream.pipe(transclude).pipe(outputStream);
}

main();
