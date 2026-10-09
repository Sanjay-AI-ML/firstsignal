import { database } from './database';

// Blocks apply to both accounts, including a member's second profile.
export async function membersBlocked(owner:string,target:string|null){
 if(!target)return false;
 const row=await database().prepare('SELECT 1 AS blocked FROM member_blocks WHERE (owner=? AND target_owner=?) OR (owner=? AND target_owner=?) LIMIT 1').bind(owner,target,target,owner).first();
 return !!row;
}
