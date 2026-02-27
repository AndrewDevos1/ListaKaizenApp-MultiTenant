import api from './api';

export const validarConviteFornecedor = async (token: string) => {
  const { data } = await api.get('/auth/validar-convite-fornecedor', {
    params: { token }
  });
  return data;
};

export const registerSupplier = async (payload: Record<string, any>) => {
  const { data } = await api.post('/auth/register-fornecedor', payload);
  return data;
};

export const registerSupplierComConvite = async (payload: Record<string, any>) => {
  const { data } = await api.post('/auth/register-fornecedor-com-convite', payload);
  return data;
};

export const getSupplierProfile = async () => {
  const { data } = await api.get('/supplier/perfil');
  return data;
};

export const updateSupplierProfile = async (payload: Record<string, any>) => {
  const { data } = await api.put('/supplier/perfil', payload);
  return data;
};

export const getSupplierItems = async () => {
  const { data } = await api.get('/supplier/itens');
  return data;
};

export const createSupplierItem = async (payload: Record<string, any>) => {
  const { data } = await api.post('/supplier/itens', payload);
  return data;
};

export const getSupplierItem = async (itemId: number) => {
  const { data } = await api.get(`/supplier/itens/${itemId}`);
  return data;
};

export const updateSupplierItem = async (itemId: number, payload: Record<string, any>) => {
  const { data } = await api.put(`/supplier/itens/${itemId}`, payload);
  return data;
};

export const deleteSupplierItem = async (itemId: number) => {
  const { data } = await api.delete(`/supplier/itens/${itemId}`);
  return data;
};

export const getItemPriceHistory = async (itemId: number) => {
  const { data } = await api.get(`/supplier/itens/${itemId}/historico-precos`);
  return data;
};

export const createConviteFornecedor = async (payload: Record<string, any>) => {
  const { data } = await api.post('/admin/convites-fornecedor', payload);
  return data;
};

export const listConvitesFornecedor = async () => {
  const { data } = await api.get('/admin/convites-fornecedor');
  return data;
};

export const deleteConviteFornecedor = async (conviteId: number) => {
  const { data } = await api.delete(`/admin/convites-fornecedor/${conviteId}`);
  return data;
};

export const updateConviteFornecedor = async (conviteId: number, payload: Record<string, any>) => {
  const { data } = await api.put(`/admin/convites-fornecedor/${conviteId}`, payload);
  return data;
};

export const listFornecedoresCadastrados = async (aprovado?: boolean) => {
  const { data } = await api.get('/admin/fornecedores-cadastrados', {
    params: aprovado === undefined ? {} : { aprovado }
  });
  return data;
};

export const aprovarFornecedor = async (fornecedorId: number, aprovado: boolean) => {
  const { data } = await api.put(`/admin/fornecedores/${fornecedorId}/aprovar`, { aprovado });
  return data;
};

export const getFornecedorDetails = async (fornecedorId: number) => {
  const { data } = await api.get(`/admin/fornecedores/${fornecedorId}`);
  return data;
};

export const getFornecedorItens = async (fornecedorId: number) => {
  const { data } = await api.get(`/admin/fornecedores/${fornecedorId}/itens`);
  return data;
};

export const updateFornecedorCadastrado = async (fornecedorId: number, payload: Record<string, any>) => {
  const { data } = await api.put(`/admin/fornecedores/${fornecedorId}`, payload);
  return data;
};

export const deleteFornecedorCadastrado = async (fornecedorId: number) => {
  const { data } = await api.delete(`/admin/fornecedores/${fornecedorId}`);
  return data;
};

export const getFornecedorUsuarios = async (fornecedorId: number) => {
  const { data } = await api.get(`/admin/fornecedores/${fornecedorId}/usuarios`);
  return data;
};

export const createFornecedorLogin = async (fornecedorId: number, payload: Record<string, any>) => {
  const { data } = await api.post(`/admin/fornecedores/${fornecedorId}/login`, payload);
  return data;
};
