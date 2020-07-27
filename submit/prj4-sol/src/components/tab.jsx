import React from 'react';


export default function Tab(props) {
  const id = props.id;
  const tabbedId = `tabbed${props.index}`;
  const checked = (props.index === 0);
  return (
    <section className="tab">
      <input type="radio" name="tab" className="tab-control"
             id={tabbedId} checked={props.isSelected}
             onChange={() => props.select(id)}/>
        <h1 className="tab-title">
          <label htmlFor={tabbedId}>{props.label}</label>
        </h1>
        <div className="tab-content" id={props.id}>
          {props.component}
        </div>
    </section>
  );
}
