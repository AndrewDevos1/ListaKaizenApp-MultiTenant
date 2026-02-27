const axiosMock = {
  defaults: {},
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
  get: jest.fn().mockResolvedValue({ data: {} }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  put: jest.fn().mockResolvedValue({ data: {} }),
  patch: jest.fn().mockResolvedValue({ data: {} }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
  create: jest.fn(),
};

axiosMock.create.mockReturnValue(axiosMock);

// Helper functions for convenient mocking
export const mockGet = (data: any) =>
  axiosMock.get.mockResolvedValueOnce({ data });

export const mockPost = (data: any) =>
  axiosMock.post.mockResolvedValueOnce({ data });

export const mockPut = (data: any) =>
  axiosMock.put.mockResolvedValueOnce({ data });

export const mockPatch = (data: any) =>
  axiosMock.patch.mockResolvedValueOnce({ data });

export const mockDelete = (data: any = {}) =>
  axiosMock.delete.mockResolvedValueOnce({ data });

export const mockError = (status: number, error: any) =>
  axiosMock.get.mockRejectedValueOnce({
    response: { status, data: error }
  });

export const resetMocks = () => {
  axiosMock.get.mockClear();
  axiosMock.post.mockClear();
  axiosMock.put.mockClear();
  axiosMock.patch.mockClear();
  axiosMock.delete.mockClear();
};

export default axiosMock;
