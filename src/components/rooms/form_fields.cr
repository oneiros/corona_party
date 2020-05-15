class Rooms::FormFields < BaseComponent
  needs operation : SaveRoom

  def render
    mount Shared::Field.new(operation.name), &.text_input(autofocus: "true")
    mount Shared::Field.new(operation.pin)
  end
end
