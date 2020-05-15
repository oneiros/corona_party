class CreateRooms::V20200511134403 < Avram::Migrator::Migration::V1
  def migrate
    # Learn about migrations at: https://luckyframework.org/guides/database/migrations
    create table_for(Room) do
      primary_key id : Int64
      add_timestamps
      add name : String
      add pin : String
    end
  end

  def rollback
    drop table_for(Room)
  end
end
