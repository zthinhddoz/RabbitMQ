const INDEX_LENGTH = 7;
const INITIAL_INDEX = "0000001"

const generateNewId = function (lastId, prefix) {
  if(lastId.length > 0){
    const nextId = Number(lastId.substr(prefix.length)) + 1;
    const nextIndex = nextId.toString().padStart(INDEX_LENGTH ,"0");
    return prefix + nextIndex;
  }
  return prefix + INITIAL_INDEX;
}

module.exports = generateNewId;


