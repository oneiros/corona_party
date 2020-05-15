class Rooms::Delete < BrowserAction
  route do
    RoomQuery.find(room_id).delete
    flash.success = "Deleted the record"
    redirect Index
  end
end
