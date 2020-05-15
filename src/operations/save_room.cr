class SaveRoom < Room::SaveOperation
  # To save user provided params to the database, you must permit them
  # https://luckyframework.org/guides/database/validating-saving#perma-permitting-columns
  permit_columns name, pin

  after_commit create_in_janus

  def create_in_janus(newly_created_room : Room)
    newly_created_room.setup_in_janus!
  end
end
