import React from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Box, Typography, Paper, Grid, useTheme } from '@mui/material';

const COLORS = ['#E6007A', '#552BBF', '#6D3AEE', '#F0C3E1', '#904FEF'];

function NFTStatisticsCharts({ stats }) {
  const theme = useTheme();
  
  if (!stats) return null;
  
  // Format event distribution data for PieChart
  const eventDistributionData = Object.entries(stats.nftsByEvent).map(([name, count], index) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    value: count,
    fullName: name,
  }));
  
  // Format recent activity data for LineChart
  const recentActivityData = Object.entries(stats.recentActivity).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    count
  }));
  
  return (
    <Box>
      <Grid container spacing={4}>
        {/* Event Distribution Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3, 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(45, 45, 45, 0.85)' 
              : 'rgba(255, 255, 255, 0.85)',
          }}>
            <Typography variant="h6" gutterBottom>
              Event Distribution
            </Typography>
            
            <Box sx={{ flexGrow: 1, height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eventDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {eventDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [value, props.payload.fullName]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        {/* Recent Activity Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3, 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(45, 45, 45, 0.85)' 
              : 'rgba(255, 255, 255, 0.85)',
          }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity (Last 7 Days)
            </Typography>
            
            <Box sx={{ flexGrow: 1, height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={recentActivityData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="NFTs Minted"
                    stroke={theme.palette.primary.main}
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default NFTStatisticsCharts; 