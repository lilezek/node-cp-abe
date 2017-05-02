if [ -d node_modules ]
then
  NODE_MODULES=node_modules
else
  NODE_MODULES=../
fi

$NODE_MODULES/.bin/node-gyp rebuild
cp build/Release/cpabe.node .
