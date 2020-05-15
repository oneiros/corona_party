class Rooms::Update < BrowserAction
  route do
    room = RoomQuery.find(room_id)
    SaveRoom.update(room, params) do |operation, room|
      if operation.saved?
        flash.success = "The record has been updated"
        redirect Show.with(room.id)
      else
        flash.failure = "It looks like the form is not valid"
        html EditPage, operation: operation, room: room
      end
    end
  end
end
