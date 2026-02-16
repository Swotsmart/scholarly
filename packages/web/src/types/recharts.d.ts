// Type declarations for recharts — installed in package.json but
// types resolve through the package's built-in declarations.
// This shim covers cases where the package hasn't been hoisted yet.
declare module 'recharts' {
  import * as React from 'react';

  export interface ResponsiveContainerProps {
    width?: string | number;
    height?: string | number;
    children?: React.ReactNode;
    className?: string;
  }
  export const ResponsiveContainer: React.FC<ResponsiveContainerProps>;

  export interface AreaChartProps {
    data?: any[];
    children?: React.ReactNode;
    className?: string;
  }
  export const AreaChart: React.FC<AreaChartProps>;

  export interface BarChartProps {
    data?: any[];
    children?: React.ReactNode;
    className?: string;
  }
  export const BarChart: React.FC<BarChartProps>;

  export interface AreaProps {
    type?: string;
    dataKey?: string;
    stroke?: string;
    fill?: string;
    fillOpacity?: number;
    stackId?: string;
    name?: string;
  }
  export const Area: React.FC<AreaProps>;

  export interface BarProps {
    dataKey?: string;
    fill?: string;
    name?: string;
    radius?: number | number[];
    stackId?: string;
  }
  export const Bar: React.FC<BarProps>;

  export interface XAxisProps {
    dataKey?: string;
    tick?: any;
    tickLine?: boolean;
    axisLine?: boolean;
    fontSize?: number;
    className?: string;
  }
  export const XAxis: React.FC<XAxisProps>;

  export interface YAxisProps {
    tick?: any;
    tickLine?: boolean;
    axisLine?: boolean;
    fontSize?: number;
    width?: number;
    className?: string;
  }
  export const YAxis: React.FC<YAxisProps>;

  export interface CartesianGridProps {
    strokeDasharray?: string;
    className?: string;
    vertical?: boolean;
  }
  export const CartesianGrid: React.FC<CartesianGridProps>;

  export interface TooltipProps {
    content?: any;
    cursor?: any;
    formatter?: any;
    labelFormatter?: any;
  }
  export const Tooltip: React.FC<TooltipProps>;

  export interface LegendProps {
    content?: any;
    verticalAlign?: string;
    height?: number;
  }
  export const Legend: React.FC<LegendProps>;
}
