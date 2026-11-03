import {researchExports} from '../assets/research/domain.js';
let input='';for await(const chunk of process.stdin)input+=chunk;
process.stdout.write(JSON.stringify(researchExports(JSON.parse(input))));
