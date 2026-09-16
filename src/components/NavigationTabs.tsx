import { useState, type ReactElement, type ReactNode, type SyntheticEvent } from 'react';
import { Box, Tab, Tabs } from '@mui/material';

export interface NavigationTabItem {
  key: string;
  label: string;
  icon?: ReactElement;
  content: ReactNode;
}

interface NavigationTabsProps {
  tabs: NavigationTabItem[];
  value?: string;
  onChange?: (key: string) => void;
}

export function NavigationTabs({ tabs, value, onChange }: NavigationTabsProps) {
  const [internalValue, setInternalValue] = useState(tabs[0]?.key ?? '');
  const activeKey = value ?? internalValue;
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  function handleChange(_event: SyntheticEvent, newValue: string) {
    setInternalValue(newValue);
    onChange?.(newValue);
  }

  return (
    <Box>
      <Tabs
        value={activeTab?.key ?? false}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.key} value={tab.key} label={tab.label} icon={tab.icon} iconPosition="start" />
        ))}
      </Tabs>
      {activeTab?.content}
    </Box>
  );
}
