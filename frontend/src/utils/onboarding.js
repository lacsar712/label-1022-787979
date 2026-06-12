const ONBOARDING_KEY = 'influencer_platform_onboarding_completed';

export const hasCompletedOnboarding = () => {
  try {
    const value = localStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch {
    return false;
  }
};

export const markOnboardingCompleted = () => {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
  }
};

export const resetOnboarding = () => {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
  }
};
