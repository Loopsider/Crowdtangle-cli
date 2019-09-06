import arg from 'arg';

function parseArgumentsIntoOptions(rawArgs) {
 const args = arg(
   {
     '--token': String,
     '--process': String,
     '--output': String,
     '-t': '--token',
     '-p': '--process',
     '-o': '--output'
   },
   {
     argv: rawArgs.slice(2),
   }
 );
 return {
   token: args['--token'] || false,
   process: args['--process'] || false,
   output: args['--output'] || './export.csv'
 };
}

export function cli(args) {
 let options = parseArgumentsIntoOptions(args);
 const process = require(`./lib/${options.process}`);
 process(options.token, options.output);
}