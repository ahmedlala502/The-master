#!/usr/bin/env node

/**
 * Emergency Admin Account Unlock Script
 * 
 * This script unlocks the admin account by directly modifying localStorage data.
 * Run this in the browser console on the same domain as your app.
 */

const STORAGE_KEY = 'trygc_hub_workspace_v5';
const ADMIN_EMAIL = 'admin@trygc.local';

function unlockAdminAccount() {
    try {
        console.log('🔍 Checking localStorage for workspace data...');
        
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            console.error('❌ No workspace data found in localStorage.');
            console.log('💡 Make sure you\'re running this in the browser console on the correct domain.');
            return false;
        }
        
        console.log('✅ Workspace data found');
        
        const workspace = JSON.parse(data);
        const adminIndex = workspace.users.findIndex(u => u.email.toLowerCase() === ADMIN_EMAIL);
        
        if (adminIndex === -1) {
            console.error('❌ Admin account not found in workspace data.');
            return false;
        }
        
        const admin = workspace.users[adminIndex];
        console.log('📋 Current admin status:');
        console.log('   - Email:', admin.email);
        console.log('   - Failed attempts:', admin.loginAttempts || 0);
        console.log('   - Locked until:', admin.lockedUntil || 'Not locked');
        
        if (!admin.loginAttempts && !admin.lockedUntil) {
            console.log('✅ Admin account is already unlocked!');
            return true;
        }
        
        console.log('🔓 Unlocking admin account...');
        
        // Reset login attempts and remove lockout
        workspace.users[adminIndex].loginAttempts = 0;
        delete workspace.users[adminIndex].lockedUntil;
        
        // Add audit log
        if (!workspace.auditLogs) workspace.auditLogs = [];
        workspace.auditLogs.unshift({
            id: 'audit-' + Date.now(),
            action: 'ACCOUNT_UNLOCKED',
            details: { 
                email: ADMIN_EMAIL, 
                method: 'emergency_unlock_script',
                previousAttempts: admin.loginAttempts || 0,
                previousLockout: admin.lockedUntil || null
            },
            timestamp: new Date().toISOString(),
            userId: 'system',
            severity: 'warning'
        });
        
        // Save back to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
        
        console.log('✅ Admin account unlocked successfully!');
        console.log('');
        console.log('📝 Login credentials:');
        console.log('   Email: admin@trygc.local');
        console.log('   Password: TryGC@2024!Secure');
        console.log('');
        console.log('🔄 Please refresh the page and try logging in again.');
        console.log('⚠️  Remember to change your password after logging in!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error unlocking account:', error.message);
        console.error(error);
        return false;
    }
}

// If running in browser console
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    console.log('🚀 TryGC Hub Manager - Emergency Admin Unlock');
    console.log('='.repeat(50));
    unlockAdminAccount();
} else {
    console.log('⚠️  This script must be run in the browser console.');
    console.log('');
    console.log('Instructions:');
    console.log('1. Open your TryGC Hub Manager in the browser');
    console.log('2. Open Developer Tools (F12 or Ctrl+Shift+I)');
    console.log('3. Go to the Console tab');
    console.log('4. Copy and paste this entire script');
    console.log('5. Press Enter to run it');
}
