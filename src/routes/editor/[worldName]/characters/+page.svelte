<script lang="ts">
    //TODO: add the data when the editor backend is ready.
    let tempData = {
        labels:[
            {
                name:'npc',
                description:'is a Non-player character',
                usedBy:[
                    {
                        type:'dialogue',
                        mappingId:'dial.small-talk-npc',
                        id:'small-talk-npc',
                        name:'NPC Small Talk',
                        priority:'low' // pre-process priority in backend to determine UI order and colors.
                    }
                ]
            }
        ],
        characters:[
            {
                id:'char1',
                name:'Character 1',
                vars:[
                    {
                        id:'desc',
                        name:'Description',
                        type:'string',
                        value:'The first character in the world'
                    },
                    {
                        id:'health',
                        name:'Health',
                        type:'number',
                        min:0,
                        max:100,
                        value:100
                    }
                ]
            }
        ]
    }
</script>