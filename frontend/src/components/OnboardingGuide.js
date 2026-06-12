import React, { useState, useEffect, useCallback } from 'react';
import { markOnboardingCompleted } from '../utils/onboarding';
import { useAuth } from '../contexts/AuthContext';

const getGuideSteps = (userRole) => {
  const allSteps = [
    {
      id: 'dashboard',
      target: '[data-guide-id="dashboard"]',
      title: '仪表盘',
      description: '查看平台核心数据概览，包括达人总数、合作项目数、预算执行情况等关键指标，快速了解业务全貌。',
      placement: 'right',
      roles: ['admin', 'operator', 'user']
    },
    {
      id: 'tasks',
      target: '[data-guide-id="tasks"]',
      title: '我的任务',
      description: '管理您的待办事项和工作任务，支持查看任务截止日期、优先级，标记任务完成状态，逾期任务将有醒目标识。',
      placement: 'right',
      roles: ['admin', 'operator', 'user']
    },
    {
      id: 'influencers',
      target: '[data-guide-id="influencers"]',
      title: 'Influencer管理',
      description: '浏览和管理平台所有达人信息，查看达人粉丝数据、合作历史、评级等详细资料，支持多维度筛选和搜索。',
      placement: 'right',
      roles: ['admin', 'operator', 'user']
    },
    {
      id: 'recommendations',
      target: '[data-guide-id="recommendations"]',
      title: '达人推荐',
      description: '基于智能算法为您推荐最适合合作的达人，根据历史表现、粉丝画像、性价比等多维度评分排序。',
      placement: 'right',
      roles: ['admin', 'operator', 'user']
    },
    {
      id: 'collaborations',
      target: '[data-guide-id="collaborations"]',
      title: '合作管理',
      description: '跟踪所有合作项目的全生命周期，从意向沟通、合同签订到执行结案，完整记录每一步进展。',
      placement: 'right',
      roles: ['admin', 'operator', 'user']
    },
    {
      id: 'budgets',
      target: '[data-guide-id="budgets"]',
      title: '季度预算规划',
      description: '按季度规划各分类的营销预算，实时监控预算执行进度，避免超支风险，优化资源分配。',
      placement: 'right',
      roles: ['admin', 'operator']
    },
    {
      id: 'categories',
      target: '[data-guide-id="categories"]',
      title: '分类管理',
      description: '维护达人分类标签体系，便于按行业、平台、内容类型等维度对达人进行分组管理。',
      placement: 'right',
      roles: ['admin', 'operator']
    },
    {
      id: 'users',
      target: '[data-guide-id="users"]',
      title: '用户管理',
      description: '管理员专属功能，管理平台用户账号、分配角色权限，支持新增、禁用用户等操作。',
      placement: 'right',
      roles: ['admin']
    },
    {
      id: 'overdue-badge',
      target: '[data-guide-id="overdue-badge"]',
      title: '逾期任务提醒',
      description: '右上角图标会实时显示您当前的逾期任务数量，点击可快速跳转至任务列表处理紧急事项。',
      placement: 'bottom',
      roles: ['admin', 'operator', 'user']
    },
    {
      id: 'user-menu',
      target: '[data-guide-id="user-menu"]',
      title: '个人中心',
      description: '点击头像可展开菜单，进入个人中心修改资料、重置密码，也可以在此处退出登录。',
      placement: 'bottom-left',
      roles: ['admin', 'operator', 'user']
    }
  ];

  return allSteps.filter(step => step.roles.includes(userRole));
};

const OnboardingGuide = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const userRole = user?.role?.name || 'user';
  const steps = getGuideSteps(userRole);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [mounted, setMounted] = useState(false);

  const updateTargetRect = useCallback(() => {
    const step = steps[currentStep];
    if (!step) return;
    
    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }
  }, [currentStep, steps]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setTargetRect(null);
      setMounted(false);
      return;
    }

    setMounted(true);
    
    const timer = setTimeout(() => {
      updateTargetRect();
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, updateTargetRect]);

  useEffect(() => {
    if (!isOpen || !mounted) return;
    
    updateTargetRect();
    
    window.addEventListener('scroll', updateTargetRect, true);
    window.addEventListener('resize', updateTargetRect);
    
    return () => {
      window.removeEventListener('scroll', updateTargetRect, true);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [isOpen, mounted, updateTargetRect]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    markOnboardingCompleted();
    onClose();
  };

  const handleFinish = () => {
    markOnboardingCompleted();
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const step = steps[currentStep];
  const padding = 8;
  
  const highlightStyle = targetRect ? {
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2
  } : {};

  const getTooltipPosition = () => {
    if (!targetRect) return { top: 0, left: 0 };
    
    const placement = step.placement || 'right';
    const tooltipWidth = 360;
    const tooltipHeight = 220;
    const spacing = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top, left;
    
    switch (placement) {
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left + targetRect.width + spacing;
        if (left + tooltipWidth > viewportWidth - 16) {
          left = targetRect.left - tooltipWidth - spacing;
        }
        break;
      case 'bottom':
        top = targetRect.top + targetRect.height + spacing;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom-left':
        top = targetRect.top + targetRect.height + spacing;
        left = targetRect.left + targetRect.width - tooltipWidth;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - spacing;
        break;
      case 'top':
        top = targetRect.top - tooltipHeight - spacing;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      default:
        top = targetRect.top + targetRect.height + spacing;
        left = targetRect.left;
    }
    
    top = Math.max(16, Math.min(top, viewportHeight - tooltipHeight - 16));
    left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));
    
    return { top, left };
  };

  const tooltipPos = getTooltipPosition();

  const getArrowStyle = () => {
    const placement = step.placement || 'right';
    const base = { position: 'absolute' };
    
    if (!targetRect) return base;
    
    const centerY = targetRect.top + targetRect.height / 2 - tooltipPos.top;
    const centerX = targetRect.left + targetRect.width / 2 - tooltipPos.left;
    
    switch (placement) {
      case 'right':
        return { ...base, left: -8, top: centerY, transform: 'translateY(-50%)', borderLeft: 'none', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '8px solid #fff' };
      case 'left':
        return { ...base, right: -8, top: centerY, transform: 'translateY(-50%)', borderRight: 'none', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '8px solid #fff' };
      case 'top':
        return { ...base, bottom: -8, left: centerX, transform: 'translateX(-50%)', borderTop: 'none', borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '8px solid #fff' };
      case 'bottom':
      case 'bottom-left':
        return { ...base, top: -8, left: centerX, transform: 'translateX(-50%)', borderBottom: 'none', borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid #fff' };
      default:
        return base;
    }
  };

  return (
    <div className="onboarding-overlay">
      <svg className="onboarding-svg" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <mask id="onboarding-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#onboarding-mask)"
        />
      </svg>

      {targetRect && (
        <div className="onboarding-highlight" style={highlightStyle} />
      )}

      <div
        className="onboarding-tooltip"
        style={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: 360,
          zIndex: 9999
        }}
      >
        <div className="onboarding-tooltip-arrow" style={getArrowStyle()} />
        
        <div className="onboarding-tooltip-header">
          <div className="onboarding-step-indicator">
            {currentStep + 1} / {steps.length}
          </div>
          <button
            className="onboarding-close-btn"
            onClick={handleSkip}
            title="跳过引导"
          >
            ✕
          </button>
        </div>

        <div className="onboarding-tooltip-body">
          <div className="onboarding-icon">{getStepIcon(step.id)}</div>
          <h3 className="onboarding-title">{step.title}</h3>
          <p className="onboarding-description">{step.description}</p>
        </div>

        <div className="onboarding-tooltip-footer">
          <div className="onboarding-dots">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`onboarding-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'done' : ''}`}
              />
            ))}
          </div>
          
          <div className="onboarding-actions">
            {currentStep > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handlePrev}
              >
                上一步
              </button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleSkip}
                >
                  跳过
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleNext}
                >
                  下一步
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleFinish}
              >
                完成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const getStepIcon = (stepId) => {
  const icons = {
    dashboard: '📊',
    tasks: '📋',
    influencers: '👤',
    recommendations: '🎯',
    collaborations: '🤝',
    budgets: '💰',
    categories: '📁',
    users: '👥',
    'overdue-badge': '⚠️',
    'user-menu': '👤'
  };
  return icons[stepId] || '💡';
};

export default OnboardingGuide;
