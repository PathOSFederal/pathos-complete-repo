// ===============================================================
// WHY: Some renderer contexts can block or omit localStorage.
// HOW: Use a memory storage fallback to keep UI responsive.
// ===============================================================
export const createMemoryStorage = () => {
  const data = {};
  return {
    getItem: (key) => {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        return data[key];
      }
      return null;
    },
    setItem: (key, value) => {
      data[key] = value;
    },
  };
};

export const createSafeStorage = (fallback) => {
  return {
    getItem: (key) => {
      try {
        return fallback.getItem(key);
      } catch (error) {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        fallback.setItem(key, value);
      } catch (error) {
        // No-op when storage is unavailable.
      }
    },
  };
};
