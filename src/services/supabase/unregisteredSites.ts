/**
 * 미등록 쇼핑몰 URL 수집 서비스
 */

import { supabase } from './client';
import { extractDomain } from '@/utils/siteDetector';

export interface UnregisteredSite {
  id: string;
  domain: string;
  full_url: string;
  user_id: string | null;
  visit_count: number;
  last_visited_at: string;
  created_at: string;
}

export interface UnregisteredSiteStats {
  domain: string;
  unique_users: number;
  total_visits: number;
  last_visit: string;
  first_discovered: string;
}

/**
 * 미등록 쇼핑몰 방문 기록
 */
export async function recordUnregisteredSite(url: string, userId?: string): Promise<void> {
  try {
    const domain = extractDomain(url);
    if (!domain) return;
    
    // Upsert: 이미 있으면 visit_count 증가, 없으면 새로 생성
    const { error } = await supabase.rpc('upsert_unregistered_site', {
      p_domain: domain,
      p_full_url: url,
      p_user_id: userId || null,
    });
    
    if (error) {
      // RPC 함수가 없을 경우 fallback: 직접 쿼리
      const { data: existing } = await supabase
        .from('unregistered_sites')
        .select('id, visit_count')
        .eq('domain', domain)
        .eq('user_id', userId || null)
        .single();
      
      if (existing) {
        // Update
        await supabase
          .from('unregistered_sites')
          .update({
            visit_count: existing.visit_count + 1,
            last_visited_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Insert
        await supabase
          .from('unregistered_sites')
          .insert({
            domain,
            full_url: url,
            user_id: userId || null,
            visit_count: 1,
          });
      }
    }
  } catch (error) {
    console.error('[recordUnregisteredSite] Error:', error);
  }
}

/**
 * 관리자: 미등록 쇼핑몰 통계 조회
 */
export async function getUnregisteredSitesStats(): Promise<UnregisteredSiteStats[]> {
  const { data, error } = await supabase
    .from('unregistered_sites_stats')
    .select('*')
    .order('unique_users', { ascending: false })
    .limit(100);
  
  if (error) {
    console.error('[getUnregisteredSitesStats] Error:', error);
    return [];
  }
  
  return data || [];
}

/**
 * 관리자: 특정 도메인 상세 정보
 */
export async function getUnregisteredSiteDetails(domain: string): Promise<UnregisteredSite[]> {
  const { data, error } = await supabase
    .from('unregistered_sites')
    .select('*')
    .eq('domain', domain)
    .order('visit_count', { ascending: false });
  
  if (error) {
    console.error('[getUnregisteredSiteDetails] Error:', error);
    return [];
  }
  
  return data || [];
}
