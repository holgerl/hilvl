# How to contribute

The public are encouraged to create issues, ask questions and make pull requests. In this file, some guidelines are given.

## Prerequisites

To run the code and tests, you need [node.js](https://nodejs.org).

## Running tests

Hilvl has an extensive test suite that should cover all the features in the language. To run them, simply run `node tests\run-all-tests.js`

To run a single test, you can run `node tests\run-all-tests.js [FILENAME]`. That will also display more debug information.

## Important principles

- Keep the syntax small and simple
- Keep the implementation small and readable
- Syntactic sugar is considered evil. Avoid adding more to the language
- All features should have accompanying tests
- Avoid making the implementation tightly bound to node.js, Javascript or any other platform
- Use a coding style similar to what is already used (naming, formatting, verbosity, etc)
- Use English for all text

*note: The language level for the JavaScript is ES6*
