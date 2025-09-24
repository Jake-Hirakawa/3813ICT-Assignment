export function transformDoc(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(transformDoc);
  
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

export function transformDocs(docs) {
  return docs.map(transformDoc);
}