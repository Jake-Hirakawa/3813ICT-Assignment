// Transform a single MongoDB document
// Converts MongoDB _id field to id string for client compatibility
// Returns: document with id instead of _id
export function transformDoc(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(transformDoc);
  
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}
// Transform an array of MongoDB documents
// Applies transformDoc to each document in array
// Returns: array of transformed documents with id fields
export function transformDocs(docs) {
  return docs.map(transformDoc);
}