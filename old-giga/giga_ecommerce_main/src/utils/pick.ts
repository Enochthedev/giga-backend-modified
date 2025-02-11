const pick = (object: any, keys: string[]) => keys.reduce((obj:any, key) => {
  if (object && Object.prototype.hasOwnProperty.call(object, key)) {
    // eslint-disable-next-line no-param-reassign
    obj[key] = object[key];
  }
  return obj;
}, {});

export default pick;
