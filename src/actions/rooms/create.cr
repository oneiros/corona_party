class Rooms::Create < BrowserAction
  route do
    SaveRoom.create(params) do |operation, room|
      if room
        flash.success = "The record has been saved"
        redirect Show.with(room.id)
      else
        flash.failure = "It looks like the form is not valid"
        html NewPage, operation: operation
      end
    end
  end
end
