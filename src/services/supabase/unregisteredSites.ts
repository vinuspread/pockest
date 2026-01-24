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
    
    // 기존 레코드 확인
    let query = supabase
      .from('unregistered_sites')
      .select('id, visit_count')
      .eq('domain', domain);
    
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }
    
    const { data: existing } = await query.maybeSingle();
    
    if (existing) {
      // Update
      await supabase
        .from('unregistered_sites')
        .update({
          visit_count: existing.visit_count + 1,
          last_visited_at: new Date().toISOString(),
          full_url: url,
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
  } catch (error) {
    console.error('[recordUnregisteredSite] Error:', error);
  }
}

/**
 * 관리자: 미등록 쇼핑몰 통계 조회
 */
export async function getUnregisteredSitesStats(): Promise<UnregisteredSiteStats[]> {
  const { data, error } = await supabase
    .from('unregistered_sites')
    .select('domain, user_id, visit_count, last_visited_at, created_at');
  
  if (error) {
    console.error('[getUnregisteredSitesStats] Error:', error);
    return [];
  }
  
  // 클라이언트 측 집계
  const statsMap = new Map<string, UnregisteredSiteStats>();
  
  data?.forEach(row => {
    const existing = statsMap.get(row.domain);
    if (existing) {
      existing.unique_users += row.user_id ? 1 : 0;
      existing.total_visits += row.visit_count;
      existing.last_visit = row.last_visited_at > existing.last_visit ? row.last_visited_at : existing.last_visit;
      existing.first_discovered = row.created_at < existing.first_discovered ? row.created_at : existing.first_discovered;
    } else {
      statsMap.set(row.domain, {
        domain: row.domain,
        unique_users: row.user_id ? 1 : 0,
        total_visits: row.visit_count,
        last_visit: row.last_visited_at,
        first_discovered: row.created_at,
      });
    }
  });
  
  return Array.from(statsMap.values())
    .sort((a, b) => b.unique_users - a.unique_users || b.total_visits - a.total_visits)
    .slice(0, 100);
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
