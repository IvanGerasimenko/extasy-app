alter table public.messages
  add column if not exists reply_to_id uuid
    references public.messages(id) on delete set null,
  add column if not exists reply_to_text text,
  add column if not exists reply_to_sender_name text;

drop policy if exists "Senders delete their messages" on public.messages;
create policy "Senders delete their messages"
  on public.messages for delete to authenticated
  using (
    sender_id = auth.uid()
    and public.is_match_member(match_id)
  );

create or replace function public.delete_chat_message(target_message_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  deleted_id uuid;
begin
  delete from public.messages
  where id = target_message_id
    and sender_id = auth.uid()
    and public.is_match_member(match_id)
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'Message not found or access denied';
  end if;

  return deleted_id;
end;
$$;

revoke all on function public.delete_chat_message(uuid) from public;
grant execute on function public.delete_chat_message(uuid) to authenticated;
