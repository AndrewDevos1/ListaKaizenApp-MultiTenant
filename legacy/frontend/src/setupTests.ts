// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

import axios from 'axios';
import { TextDecoder, TextEncoder } from 'util';

const globalAny = global as typeof globalThis;

if (!globalAny.TextEncoder) {
  globalAny.TextEncoder = TextEncoder;
}

if (!globalAny.TextDecoder) {
  globalAny.TextDecoder = TextDecoder;
}

const axiosMock = axios as unknown as {
  create: jest.Mock;
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
};

axiosMock.create.mockReturnValue(axios);
axiosMock.get.mockResolvedValue({ data: { usuarios: [] } });
axiosMock.post.mockResolvedValue({ data: {} });
axiosMock.put.mockResolvedValue({ data: {} });
axiosMock.patch.mockResolvedValue({ data: {} });
axiosMock.delete.mockResolvedValue({ data: {} });
