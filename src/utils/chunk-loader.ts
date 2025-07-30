
// Auto-generated chunk loaders


export const chunkLoaders = {

};

export const loadChunk = async (chunkName: string) => {
  const loader = chunkLoaders[chunkName];
  if (!loader) {
    throw new Error(`Chunk '${chunkName}' not found`);
  }
  return loader();
};