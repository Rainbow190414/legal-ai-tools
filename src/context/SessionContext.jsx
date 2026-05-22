import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const SessionContext = createContext(null);

// 数据存储键名常量
export const STORAGE_KEYS = {
  CASE_MATERIALS: 'case_materials',       // 案卷材料（PDF读取后的文本）
  CASE_ANALYSIS: 'case_analysis',         // 案件分析结果
  TRANSCRIPT_DATA: 'transcript_data',     // 笔录整理数据
  CONTRACT_TEXT: 'contract_text',         // 合同文本
  CONTRACT_REVIEW: 'contract_review',     // 合同审查结果
  NDA_TEXT: 'nda_text',                   // NDA文本
  NDA_REVIEW: 'nda_review',               // NDA审查结果
  RISK_ASSESSMENT: 'risk_assessment',     // 风险评估结果
  MEETING_NOTES: 'meeting_notes',         // 会议纪要
  MEETING_BRIEFING: 'meeting_briefing',   // 会议简报
  LEGAL_PROPOSAL: 'legal_proposal',       // 法律服务方案
  COMPLIANCE_DATA: 'compliance_data',     // 合规审查数据
  DESENSITIZE_RESULT: 'desensitize_result', // 脱敏结果
};

export function SessionProvider({ children }) {
  const [sessionData, setSessionData] = useState(() => {
    // 从sessionStorage初始化
    try {
      const saved = sessionStorage.getItem('legal_ai_session');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // API Key 状态 - 从 localStorage 读取
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem('kimi_api_key') || '';
    } catch {
      return '';
    }
  });

  // 模型设置
  const [model, setModel] = useState(() => {
    try {
      return localStorage.getItem('kimi_model') || 'moonshot-v1-128k';
    } catch {
      return 'moonshot-v1-128k';
    }
  });

  const [temperature, setTemperature] = useState(() => {
    try {
      const saved = localStorage.getItem('kimi_temperature');
      return saved ? parseFloat(saved) : 0.3;
    } catch {
      return 0.3;
    }
  });

  // 监听 localStorage 变化（同步其他标签页）
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'kimi_api_key') {
        setApiKey(e.newValue || '');
      } else if (e.key === 'kimi_model') {
        setModel(e.newValue || 'moonshot-v1-128k');
      } else if (e.key === 'kimi_temperature') {
        setTemperature(e.newValue ? parseFloat(e.newValue) : 0.3);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 保存 API Key
  const saveApiKey = useCallback((key) => {
    localStorage.setItem('kimi_api_key', key);
    setApiKey(key);
  }, []);

  // 保存模型设置
  const saveModel = useCallback((m) => {
    localStorage.setItem('kimi_model', m);
    setModel(m);
  }, []);

  // 保存温度参数
  const saveTemperature = useCallback((t) => {
    localStorage.setItem('kimi_temperature', t.toString());
    setTemperature(t);
  }, []);

  // 保存数据到session和sessionStorage
  const saveData = useCallback((key, value) => {
    setSessionData(prev => {
      const updated = { ...prev, [key]: { value, timestamp: Date.now() } };
      try {
        sessionStorage.setItem('legal_ai_session', JSON.stringify(updated));
      } catch (e) {
        console.warn('sessionStorage已满，部分数据可能无法保存');
      }
      return updated;
    });
  }, []);

  // 获取数据
  const getData = useCallback((key) => {
    const entry = sessionData[key];
    if (!entry) return null;
    // 检查数据是否过期（默认2小时）
    const maxAge = 2 * 60 * 60 * 1000;
    if (Date.now() - entry.timestamp > maxAge) {
      return null;
    }
    return entry.value;
  }, [sessionData]);

  // 清除指定数据
  const clearData = useCallback((key) => {
    setSessionData(prev => {
      const updated = { ...prev };
      delete updated[key];
      try {
        sessionStorage.setItem('legal_ai_session', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // 清除所有数据
  const clearAll = useCallback(() => {
    setSessionData({});
    sessionStorage.removeItem('legal_ai_session');
  }, []);

  // 获取数据摘要（用于显示"已有数据"提示）
  const getDataSummary = useCallback((key) => {
    const entry = sessionData[key];
    if (!entry) return null;
    const value = entry.value;
    if (typeof value === 'string') {
      return { preview: value.substring(0, 100) + '...', length: value.length, time: entry.timestamp };
    }
    if (Array.isArray(value)) {
      return { count: value.length, time: entry.timestamp };
    }
    if (typeof value === 'object') {
      return { keys: Object.keys(value), time: entry.timestamp };
    }
    return { time: entry.timestamp };
  }, [sessionData]);

  const value = {
    apiKey,
    model,
    temperature,
    saveApiKey,
    saveModel,
    saveTemperature,
    sessionData,
    saveData,
    getData,
    clearData,
    clearAll,
    getDataSummary
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export default SessionContext;
