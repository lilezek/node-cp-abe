# CP-ABE bindings for NodeJS

Here you can find bindings of CP-ABE suite for NodeJS. In order to make this
project to work you will need `libswabe-0.9`, `pbc-0.5.14` and `cpabe-0.11`.

## Patches to bswabe, cpabe and pbc

Before compiling those C libraries you should read this:

http://stackoverflow.com/questions/17373306/error-in-linking-gmp-while-compiling-cpabe-package-from-its-source-code

Also, you will to compile those libraries with `-fPIC` option (or equivalent) in
order to be compatible with node-gyp.

You should also delete or comment out the function `die`. You can find it
in `cpabe-0.11/common.c`.

## Compilation

You can compile this project if these dependencies are already solved:

```
libbswabe-0.9/libbswabe.a
pbc-0.5.14/.libs/libpbc.so
/lib/x86_64-linux-gnu/libglib-2.0.so.0
```

```
node-gyp configure
node-gyp build
cp build/Release/cp-abe.node jssrc/
```
