import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/common/Layout';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import BalanceReports from './views/BalanceReports';
import PositionReport from './views/PositionReport';
import CorrespondentReports from './views/CorrespondentReports';
import CorrespondentBankManagement from './views/CorrespondentBankManagement';
import DailyBalanceEntry from './views/DailyBalanceEntry';
import Transactions from './views/Transactions';
import ExchangeRates from './views/ExchangeRates';
import DailyBalances from './views/DailyBalances';
import PaidUpCapital from './views/PaidUpCapital';
import BalanceItems from './views/BalanceItems';
import UserManagement from './views/UserManagement';
import CurrencyManagement from './views/CurrencyManagement';
import LoadingSpinner from './components/common/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="App">
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/" 
          element={user ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="daily-balances" element={<DailyBalances />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="exchange-rates" element={<ExchangeRates />} />
          <Route path="balance-reports" element={<BalanceReports />} />
          <Route path="position-report" element={<PositionReport />} />
          <Route path="correspondent-reports" element={<CorrespondentReports />} />
          <Route path="CorrespondentBankManagement" element={<CorrespondentBankManagement />} />
          <Route path="DailyBalanceEntry" element={<DailyBalanceEntry />} />
          <Route path="paid-up-capital" element={<PaidUpCapital />} />
          <Route path="balance-items" element={<BalanceItems />} />
          {user?.role === 'admin' && (
            <Route path="users" element={<UserManagement />} />
          )}
          {user?.role === 'admin' && (
           
            <Route path="currency-management" element={<CurrencyManagement />} />
          )}
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </div>
  );
}

export default App;