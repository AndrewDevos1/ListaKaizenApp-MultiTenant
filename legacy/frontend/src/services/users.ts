import api from './api';

export const usersApi = {
  updateWizardStatus: async (wizardStatus: Record<string, any>) => {
    const { data } = await api.patch('/auth/profile/wizard', { wizardStatus });
    return data;
  },
};
