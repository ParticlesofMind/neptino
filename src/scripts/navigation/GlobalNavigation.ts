/**
 * Global Navigation System
 * Centralized navigation for the entire Neptino platform
 */

import { supabase } from '../backend/supabase';
import { signOut, getCurrentUser } from '../backend/auth/auth';

export interface NavigationConfig {
 // Page types that need different navigation setups
 pageType: 'auth' | 'student' | 'teacher' | 'admin' | 'shared';
 // Current page context
 currentPage: string;
 // User role for role-based navigation
 userRole?: string;
}

export class GlobalNavigation {
 private config: NavigationConfig;
 private currentUser: any = null;

 constructor(config: NavigationConfig) {
 this.config = config;
 this.init();
 }

 private async init(): Promise<void> {
 // Get current user
 this.currentUser = getCurrentUser();
 
 // Setup navigation based on page type
 this.setupNavigation();
 
 // Setup event listeners
 this.setupEventListeners();
 
 // Update navigation state
 await this.updateNavigationState();
 }

 private setupNavigation(): void {
 switch (this.config.pageType) {
 case 'auth':
 this.setupAuthNavigation();
 break;
 case 'student':
 this.setupStudentNavigation();
 break;
 case 'teacher':
 this.setupTeacherNavigation();
 break;
 case 'admin':
 this.setupAdminNavigation();
 break;
 case 'shared':
 this.setupSharedNavigation();
 break;
 }
 }

 private setupAuthNavigation(): void {
 // Auth pages (signin/signup) - minimal navigation
 const navActions = document.querySelector('element');
 if (navActions) {
 // Add appropriate sign in/sign up links based on current page
 if (this.config.currentPage.includes('signin')) {
 navActions.innerHTML = `
 <a href="/src/pages/shared/signup.html" class="button button--secondary">
 Sign Up
 </a>
 `;
 } else if (this.config.currentPage.includes('signup')) {
 navActions.innerHTML = `
 <a href="/src/pages/shared/signin.html" class="button button--secondary">
 Sign In
 </a>
 `;
 }
 }
 }

 private setupStudentNavigation(): void {
 this.setupUserNavigation('student');
 }

 private setupTeacherNavigation(): void {
 this.setupUserNavigation('teacher');
 }

 private setupAdminNavigation(): void {
 this.setupUserNavigation('admin');
 }

 private setupSharedNavigation(): void {
 // Public pages - show sign in/up options
 const navActions = document.querySelector('element');
 if (navActions && !this.currentUser) {
 navActions.innerHTML = `
 <a href="/src/pages/shared/signin.html" class="button button--secondary">
 Sign In
 </a>
 <a href="/src/pages/shared/signup.html" class="button button--primary">
 Sign Up
 </a>
 `;
 }
 }

 private setupUserNavigation(role: string): void {
 // Setup navigation for authenticated users
 const navLinks = document.querySelector('element');
 const navActions = document.querySelector('element');

 if (navLinks) {
 navLinks.innerHTML = this.generateRoleBasedLinks(role);
 }

 if (navActions) {
 navActions.innerHTML = `
 <div class="">
 <button class="button button--ghost nav__user-button" id="user-menu-toggle">
 <span class="">👤</span>
 <span class="" id="user-name">Loading...</span>
 </button>
 <div class="" id="user-dropdown" style="display: none;">
 <a href="/src/pages/${role}/home.html" class="">
 Dashboard
 </a>
 <a href="#" class="" id="profile-link">
 Profile
 </a>
 <a href="#" class="" id="settings-link">
 Settings
 </a>
 <hr class="">
 <button class="nav__dropdown-item nav__sign-out" id="sign-out-btn">
 Sign Out
 </button>
 </div>
 </div>
 `;
 }
 }

 private generateRoleBasedLinks(role: string): string {
 const baseLinks = {
 student: [
 { href: '/src/pages/student/home.html', text: 'Dashboard' },
 { href: '/src/pages/student/courses.html', text: 'My Courses' },
 { href: '/src/pages/student/progress.html', text: 'Progress' }
 ],
 teacher: [
 { href: '/src/pages/teacher/home.html', text: 'Dashboard' },
 { href: '/src/pages/teacher/courses.html', text: 'My Courses' },
 { href: '/src/pages/teacher/coursebuilder.html', text: 'Course Builder' }
 ],
 admin: [
 { href: '/src/pages/admin/home.html', text: 'Dashboard' },
 { href: '/src/pages/admin/users.html', text: 'Users' },
 { href: '/src/pages/admin/analytics.html', text: 'Analytics' }
 ]
 };

 const links = baseLinks[role as keyof typeof baseLinks] || [];
 
 return `
 <ul class="list list--nav">
 ${links.map(link => `
 <li class="">
 <a href="${link.href}" class="link link--nav ${this.isCurrentPage(link.href) ? "" : ''}">
 ${link.text}
 </a>
 </li>
 `).join('')}
 </ul>
 `;
 }

 private isCurrentPage(href: string): boolean {
 return window.location.pathname.includes(href.split('/').pop() || '');
 }

 private setupEventListeners(): void {
 // Language dropdown toggle
 document.addEventListener('click', (e) => {
 const target = e.target as HTMLElement;
 
 // Language dropdown toggle
 if (target.closest('#language-toggle')) {
 e.preventDefault();
 this.toggleLanguageDropdown();
 }
 
 // Language selection
 const langTarget = target.closest('[data-lang]') as HTMLButtonElement | null;
 if (langTarget) {
 e.preventDefault();
 const selectedLang = langTarget.getAttribute('data-lang');
 if (selectedLang) {
 this.handleLanguageChange(selectedLang);
 }
 }
 
 // User menu toggle
 if (target.closest('#user-menu-toggle')) {
 e.preventDefault();
 this.toggleUserMenu();
 }
 
 // Sign out button
 if (target.closest('#sign-out-btn') || target.closest('#logout-btn')) {
 e.preventDefault();
 this.handleSignOut();
 }
 
 // Close dropdowns when clicking outside
 if (!target.closest('.dropdown') && !target.closest('.nav__user-menu')) {
 this.closeAllDropdowns();
 }
 });

 // Listen for auth state changes
 supabase.auth.onAuthStateChange((event, session) => {
 if (event === 'SIGNED_IN' && session?.user) {
 this.currentUser = session.user;
 this.updateNavigationState();
 } else if (event === 'SIGNED_OUT') {
 this.currentUser = null;
 this.updateNavigationState();
 }
 });
 }

 // Public method to manually update navigation
 public updateNavigation(config: Partial<NavigationConfig>): void {
 this.config = { ...this.config, ...config };
 this.setupNavigation();
 this.updateNavigationState();
 }

 private toggleUserMenu(): void {
 const dropdown = document.getElementById('user-dropdown');
 if (dropdown) {
 dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
 }
 }

 private closeUserMenu(): void {
 const dropdown = document.getElementById('user-dropdown');
 if (dropdown) {
 dropdown.style.display = 'none';
 }
 }

 private toggleLanguageDropdown(): void {
 const toggle = document.getElementById('language-toggle');
 const menu = document.getElementById('language-menu');
 
 if (toggle && menu) {
 const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
 const newState = !isExpanded;
 
 toggle.setAttribute('aria-expanded', newState.toString());
 menu.classList.toggle('dropdown__menu--active', newState);
 menu.classList.toggle('hidden', !newState);
 }
 }

 private handleLanguageChange(langCode: string): void {
 const languages = {
 'en': 'EN',
 'es': 'ES', 
 'fr': 'FR',
 'de': 'DE'
 };
 
 // Update the dropdown toggle text
 const dropdownText = document.querySelector('[data-language-label]') || document.querySelector('.dropdown__text');
 if (dropdownText) {
 dropdownText.textContent = languages[langCode as keyof typeof languages] || 'EN';
 }
 
 // Close the dropdown
 this.closeLanguageDropdown();
 
 // Here you would typically handle the actual language change
 }

 private closeLanguageDropdown(): void {
 const toggle = document.getElementById('language-toggle');
 const menu = document.getElementById('language-menu');
 
 if (toggle && menu) {
 toggle.setAttribute('aria-expanded', 'false');
 menu.classList.remove('dropdown__menu--active');
 menu.classList.add('hidden');
 }
 }

 private closeAllDropdowns(): void {
 this.closeUserMenu();
 this.closeLanguageDropdown();
 }

 private async handleSignOut(): Promise<void> {
 try {
 console.log("👤 Sign out initiated");
 const result = await signOut();
 
 if (result.success) {
 console.log("✅ Sign out completed successfully");
 // Redirect to home page
 setTimeout(() => {
 window.location.href = '/index.html';
 }, 300);
 } else {
 console.error('❌ Sign out failed:', result.error);
 
 // Show error to user with option to force logout
 const shouldForceLogout = confirm(
 `Sign out failed: ${result.error}\n\nDo you want to force logout and return to home?`
 );
 
 if (shouldForceLogout) {
 console.log("🔄 Forcing logout...");
 setTimeout(() => {
 window.location.href = '/index.html';
 }, 300);
 }
 }
 } catch (error) {
 const errorMessage = error instanceof Error ? error.message : String(error);
 console.error('❌ Sign out error:', errorMessage);
 
 // Even on error, offer option to redirect home
 const shouldRedirect = confirm(
 `An error occurred during sign out: ${errorMessage}\n\nReturn to home page?`
 );
 
 if (shouldRedirect) {
 window.location.href = '/index.html';
 }
 }
 }

 private async updateNavigationState(): Promise<void> {
 // Update user name display
 const userNameElement = document.getElementById('user-name');
 if (userNameElement && this.currentUser) {
 const userName = this.currentUser.user_metadata?.full_name || 
 this.currentUser.email?.split('@')[0] || 
 'User';
 userNameElement.textContent = userName;
 }

 // Update active navigation links
 this.updateActiveLinks();
 }

 private updateActiveLinks(): void {
 // Remove all active classes
 document.querySelectorAll('elements').forEach(link => {
 link
 });

 // Add active class to current page link
 const currentPath = window.location.pathname;
 document.querySelectorAll('elements').forEach(link => {
 const href = (link as HTMLAnchorElement).href;
 if (href && currentPath.includes(href.split('/').pop() || '')) {
 link
 }
 });
 }
}

// Auto-detect page type and initialize navigation
export function initializeGlobalNavigation(): GlobalNavigation {
 const currentPath = window.location.pathname;
 
 let pageType: NavigationConfig['pageType'] = 'shared';
 
 if (currentPath.includes('/pages/shared/signin') || currentPath.includes('/pages/shared/signup')) {
 pageType = 'auth';
 } else if (currentPath.includes('/pages/student/')) {
 pageType = 'student';
 } else if (currentPath.includes('/pages/teacher/')) {
 pageType = 'teacher';
 } else if (currentPath.includes('/pages/admin/')) {
 pageType = 'admin';
 }

 const config: NavigationConfig = {
 pageType,
 currentPage: currentPath
 };

 return new GlobalNavigation(config);
}
