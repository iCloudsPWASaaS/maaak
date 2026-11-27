alter table matrimony.user_profiles
  drop constraint if exists user_profiles_voice_bio_duration_sec_check;

alter table matrimony.user_profiles
  add constraint user_profiles_voice_bio_duration_sec_check
  check (voice_bio_duration_sec is null or voice_bio_duration_sec <= 120);
