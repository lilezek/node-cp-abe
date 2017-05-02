# Dependencies
This project depends on `gmp`, `glib`, `flex`, `bison`

# CP-ABE bindings for NodeJS

Here you can find bindings of CP-ABE suite for NodeJS. In order to make this
project to work you will need `libswabe-0.9`, `pbc-0.5.14` and `cpabe-0.11`. These
dependencies **will be downloaded and compiled automatically**.

## Patches to bswabe, cpabe and pbc

Before compiling those C libraries this project applies these patches:

http://stackoverflow.com/questions/17373306/error-in-linking-gmp-while-compiling-cpabe-package-from-its-source-code

Also, those libraries will be compiled with `-fPIC` option (or equivalent) in
order to be compatible with node-gyp.

The function `die` is commented out and header now uses `const char *` instead of
`char *`.

Every patch can be found at patches folder.

## Compilation

You can compile this project if these dependencies are already solved:

```
libbswabe-0.9/libbswabe.a
pbc-0.5.14/.libs/libpbc.so
/lib/x86_64-linux-gnu/libglib-2.0.so.0
```

After that, you must use node-gyp to compile the module

```
node-gyp configure
node-gyp build
```

And you can check that bindings compiled correctly by executing the tests.

```
cp build/Release/cp-abe.node jssrc/
npm install
npm test
```
